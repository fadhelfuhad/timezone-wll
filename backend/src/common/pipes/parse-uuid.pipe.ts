import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Pipe that validates a route parameter is a valid UUID v1–v5.
 * Returns a clean 400 Bad Request with a human-readable message when the
 * value does not match the expected format, instead of the cryptic default.
 *
 * @example
 * @Get(':id')
 * findOne(@Param('id', ParseUUIDPipe) id: string) { ... }
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
      throw new BadRequestException(
        `"${value}" is not a valid UUID. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
      );
    }

    return value.toLowerCase();
  }
}
