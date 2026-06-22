import React, { useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Avatar, LinearProgress, IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getUsers, createUser, updateUser, deleteUser } from '../api/users.api';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

const createSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF']),
});

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).or(z.literal('')).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF']).optional(),
});

type CreateValues = z.infer<typeof createSchema>;
type UpdateValues = z.infer<typeof updateSchema>;

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function getAvatarColor(role: string) {
  if (role === 'SUPER_ADMIN') return '#7b1fa2';
  return role === 'ADMIN' ? '#1a1a2e' : '#c9a84c';
}

interface UserFormDialogProps {
  open: boolean;
  user?: User | null;
  onClose: () => void;
  currentUserRole: string;
}

function UserFormDialog({ open, user, onClose, currentUserRole }: UserFormDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const isEdit = !!user;
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema) as any,
    defaultValues: { role: 'STAFF' },
  });

  React.useEffect(() => {
    if (user) {
      reset({ firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, password: '' });
    } else {
      reset({ role: 'STAFF', firstName: '', lastName: '', email: '', password: '' });
    }
  }, [user, reset]);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      enqueueSnackbar('User created', { variant: 'success' });
      onClose();
    },
    onError: (err: any) => enqueueSnackbar(err?.message ?? 'Failed to create user', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateValues }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      enqueueSnackbar('User updated', { variant: 'success' });
      onClose();
    },
    onError: (err: any) => enqueueSnackbar(err?.message ?? 'Failed to update user', { variant: 'error' }),
  });

  const onSubmit = (data: CreateValues) => {
    if (isEdit && user) {
      const payload: UpdateValues = { firstName: data.firstName, lastName: data.lastName, email: data.email, role: data.role };
      if (data.password) payload.password = data.password;
      updateMutation.mutate({ id: user.id, data: payload });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit User' : 'Create User'}</DialogTitle>
      <DialogContent dividers>
        <Box component="form" id="user-form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField {...register('firstName')} label="First Name" fullWidth error={!!errors.firstName} helperText={errors.firstName?.message} />
              <TextField {...register('lastName')} label="Last Name" fullWidth error={!!errors.lastName} helperText={errors.lastName?.message} />
            </Stack>
            <TextField {...register('email')} label="Email" type="email" fullWidth error={!!errors.email} helperText={errors.email?.message} />
            <TextField
              {...register('password')}
              label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}
              type="password"
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <FormControl fullWidth error={!!errors.role}>
              <InputLabel>Role</InputLabel>
              <Controller name="role" control={control} render={({ field }) => (
                <Select {...field} label="Role">
                  <MenuItem value="SUPER_ADMIN" disabled={!isSuperAdmin}>
                    Super Admin
                    {!isSuperAdmin && (
                      <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                        (Super Admin only)
                      </Typography>
                    )}
                  </MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="STAFF">Staff</MenuItem>
                </Select>
              )} />
            </FormControl>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button variant="contained" form="user-form" type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : isEdit ? 'Update User' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers({}),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      enqueueSnackbar('User deactivated', { variant: 'success' });
      setDeleteId(null);
    },
    onError: () => enqueueSnackbar('Delete failed', { variant: 'error' }),
  });

  const users: User[] = data?.data ?? [];

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" mb={3} gap={1}>
        <PageHeader title="User Management" subtitle={`${users.length} users`} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Add User
        </Button>
      </Stack>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 && !isLoading ? (
              <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No users found</Typography></TableCell></TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: getAvatarColor(u.role), fontSize: 13, fontWeight: 700 }}>
                        {getInitials(u.firstName, u.lastName)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{u.firstName} {u.lastName}</Typography>
                        {u.id === currentUser?.id && (
                          <Typography variant="caption" color="primary.main">(you)</Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role === 'SUPER_ADMIN' ? 'Super Admin' : u.role === 'ADMIN' ? 'Admin' : 'Staff'}
                      size="small"
                      color={u.role === 'SUPER_ADMIN' ? 'secondary' : u.role === 'ADMIN' ? 'primary' : 'default'}
                      variant={u.role === 'STAFF' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={u.isActive ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => setEditUser(u)}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    {u.id !== currentUser?.id && (
                      <Tooltip title="Deactivate">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(u.id)}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <UserFormDialog open={createOpen} onClose={() => setCreateOpen(false)} currentUserRole={currentUser?.role ?? 'STAFF'} />
      <UserFormDialog open={!!editUser} user={editUser} onClose={() => setEditUser(null)} currentUserRole={currentUser?.role ?? 'STAFF'} />

      <ConfirmDialog
        open={!!deleteId}
        title="Deactivate User"
        message="This user will be deactivated and can no longer log in. Are you sure?"
        severity="warning"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        confirmText="Deactivate"
      />
    </Box>
  );
}
