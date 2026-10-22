import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

import { workspaceContext } from '../common/workspace/workspace';

// Tables whose rows belong to a workspace. Every query on them is scoped below.
const SCOPED_MODELS = new Set([
  'InventoryItem',
  'InventoryImport',
  'InventoryImportRow',
  'AuditLog',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

    super({
      log:
        nodeEnv === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'info' },
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' },
            ]
          : [
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' },
            ],
      errorFormat: nodeEnv === 'development' ? 'pretty' : 'minimal',
    });
  }

  async onModuleInit(): Promise<void> {
    const nodeEnv = this.configService.get<string>(
      'app.nodeEnv',
      'development',
    );

    // Query logging in development
    if (nodeEnv === 'development') {
      (this as unknown as PrismaClient).$on(
        'query' as never,
        (event: Prisma.QueryEvent) => {
          this.logger.debug(
            `Query: ${event.query} | Params: ${event.params} | Duration: ${event.duration}ms`,
          );
        },
      );

      (this as unknown as PrismaClient).$on(
        'info' as never,
        (event: Prisma.LogEvent) => {
          this.logger.log(event.message);
        },
      );
    }

    (this as unknown as PrismaClient).$on(
      'warn' as never,
      (event: Prisma.LogEvent) => {
        this.logger.warn(event.message);
      },
    );

    (this as unknown as PrismaClient).$on(
      'error' as never,
      (event: Prisma.LogEvent) => {
        this.logger.error(event.message);
      },
    );

    // Workspace scoping first, so nothing below it can see another workspace's rows.
    this.$use(this.workspaceMiddleware());
    // Register soft-delete middleware for InventoryItem
    this.$use(this.softDeleteMiddleware());

    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Keeps every workspace's data separate. For the scoped tables it:
   * - adds `workspace = <current>` to the where clause of every read, update and delete,
   *   so guests can never read or change COMPANY rows (and vice versa);
   * - stamps new rows with the current workspace and refuses rows that name another one;
   * - never lets an update move a row to a different workspace.
   * The workspace comes from the signed-in user (see WorkspaceInterceptor). With no
   * workspace it fails closed: reads throw, and creates must name their workspace
   * explicitly (only sign-in audit entries do this, before a session exists).
   * Raw SQL bypasses middleware, so raw queries add `workspaceSql()` themselves.
   */
  private workspaceMiddleware(): Prisma.Middleware {
    return async (params, next) => {
      if (!params.model || !SCOPED_MODELS.has(params.model)) {
        return next(params);
      }
      const workspace = workspaceContext.getStore()?.workspace;
      const args = (params.args ??= {});

      const stamp = (data: Record<string, unknown>) => {
        if (workspace && data.workspace && data.workspace !== workspace) {
          throw new Error(
            `Refusing to write a ${params.model} into another workspace`,
          );
        }
        if (!workspace && !data.workspace) {
          throw new Error(
            `Refusing to create a ${params.model} without a workspace`,
          );
        }
        return { ...data, workspace: workspace ?? data.workspace };
      };
      const unmoved = (data?: Record<string, unknown>) => {
        if (!data) return data;
        const rest = { ...data };
        delete rest.workspace;
        return rest;
      };

      if (params.action === 'create') {
        args.data = stamp(args.data ?? {});
        return next(params);
      }
      if (params.action === 'createMany') {
        args.data = Array.isArray(args.data)
          ? args.data.map(stamp)
          : stamp(args.data ?? {});
        return next(params);
      }

      if (!workspace) {
        throw new Error(
          `Refusing an unscoped ${params.action} on ${params.model}`,
        );
      }
      args.where = { ...(args.where ?? {}), workspace };
      if (params.action === 'upsert') {
        args.create = stamp(args.create ?? {});
        args.update = unmoved(args.update);
      } else if ('data' in args) {
        args.data = unmoved(args.data);
      }
      return next(params);
    };
  }

  /**
   * Soft-delete middleware for InventoryItem model.
   * Intercepts `delete` and `deleteMany` operations and converts them to
   * updates that set `isDeleted = true` and `deletedAt = now()`.
   * Also filters out soft-deleted records from `findFirst`, `findMany`,
   * `findUnique`, `count`, and `aggregate` queries unless the caller
   * explicitly includes `{ isDeleted: true }` in the where clause.
   */
  private softDeleteMiddleware(): Prisma.Middleware {
    return async (
      params: Prisma.MiddlewareParams,
      next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
    ) => {
      if (params.model !== 'InventoryItem') {
        return next(params);
      }

      // Intercept delete → soft delete
      if (params.action === 'delete') {
        params.action = 'update';
        params.args = {
          ...params.args,
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        };
        return next(params);
      }

      // Intercept deleteMany → soft deleteMany
      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        params.args = {
          ...params.args,
          data: {
            ...(params.args?.data ?? {}),
            isDeleted: true,
            deletedAt: new Date(),
          },
        };
        return next(params);
      }

      // Filter out soft-deleted records from read queries
      const readActions = [
        'findFirst',
        'findMany',
        'findUnique',
        'findFirstOrThrow',
        'findUniqueOrThrow',
        'count',
        'aggregate',
        'groupBy',
      ];

      if (readActions.includes(params.action)) {
        const where = params.args?.where ?? {};

        // Only inject filter when caller has not explicitly requested deleted items
        if (where.isDeleted === undefined) {
          params.args = {
            ...params.args,
            where: {
              ...where,
              isDeleted: false,
            },
          };
        }
      }

      // Filter nested relations on update/updateMany to exclude soft-deleted
      if (params.action === 'update' || params.action === 'updateMany') {
        const where = params.args?.where ?? {};
        if (where.isDeleted === undefined) {
          params.args = {
            ...params.args,
            where: {
              ...where,
              isDeleted: false,
            },
          };
        }
      }

      return next(params);
    };
  }
}
