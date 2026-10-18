import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import LockResetIcon from '@mui/icons-material/LockReset';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import { changePassword } from '../../api/auth.api';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/\d/, 'Must include a number')
      .regex(/[\W_]/, 'Must include a special character'),
    confirmPassword: z.string().min(1, 'Please confirm the new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  STAFF: 'Staff',
};

// Live checklist of the backend's complexity requirements.
const REQUIREMENTS: { label: string; test: (v: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /\d/.test(v) },
  { label: 'One special character', test: (v) => /[\W_]/.test(v) },
];

function extractError(err: unknown): string {
  const body = err as { message?: string | string[] } | undefined;
  if (body?.message) {
    return Array.isArray(body.message) ? body.message[0] : body.message;
  }
  return 'Could not change password. Please try again.';
}

export default function ProfileSettingsDialog({ open, onClose }: ProfileSettingsDialogProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isValid },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPasswordValue = watch('newPassword');
  const checklist = useMemo(
    () => REQUIREMENTS.map((r) => ({ label: r.label, met: r.test(newPasswordValue ?? '') })),
    [newPasswordValue],
  );

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?';

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    setServerError(null);
    setSuccess(false);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSuccess(false);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      setSuccess(true);
      reset();
    } catch (err) {
      setServerError(extractError(err));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
        Profile Settings
        <IconButton
          onClick={handleClose}
          aria-label="close"
          sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Account summary */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'secondary.main',
              color: '#fff',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
          <Box minWidth={0}>
            <Typography variant="h6" fontWeight={700} noWrap>
              {user ? `${user.firstName} ${user.lastName}` : 'Unknown user'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
            {user?.role && (
              <Chip
                label={ROLE_LABELS[user.role] ?? user.role}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Change password */}
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <LockResetIcon fontSize="small" color="action" />
          <Typography variant="subtitle1" fontWeight={700}>
            Change Password
          </Typography>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
            Your password has been changed. Use it the next time you log in.
          </Alert>
        )}
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}

        <Box component="form" id="change-password-form" onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            <Controller
              name="currentPassword"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Current password"
                  type={showCurrent ? 'text' : 'password'}
                  fullWidth
                  autoComplete="current-password"
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowCurrent((s) => !s)}
                          edge="end"
                          size="small"
                          aria-label="toggle current password visibility"
                        >
                          {showCurrent ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="newPassword"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="New password"
                  type={showNew ? 'text' : 'password'}
                  fullWidth
                  autoComplete="new-password"
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNew((s) => !s)}
                          edge="end"
                          size="small"
                          aria-label="toggle new password visibility"
                        >
                          {showNew ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Confirm new password"
                  type={showConfirm ? 'text' : 'password'}
                  fullWidth
                  autoComplete="new-password"
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirm((s) => !s)}
                          edge="end"
                          size="small"
                          aria-label="toggle confirm password visibility"
                        >
                          {showConfirm ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* Live requirements checklist */}
            <Box
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 1.5,
                px: 2,
                py: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Password must contain:
              </Typography>
              <Stack spacing={0.5} mt={0.75}>
                {checklist.map((item) => (
                  <Box key={item.label} display="flex" alignItems="center" gap={1}>
                    {item.met ? (
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{ color: item.met ? 'success.main' : 'text.secondary' }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <LoadingButton onClick={handleClose} color="inherit" disabled={isSubmitting}>
          Close
        </LoadingButton>
        <LoadingButton
          type="submit"
          form="change-password-form"
          variant="contained"
          color="secondary"
          loading={isSubmitting}
          disabled={!isValid}
          startIcon={<LockResetIcon />}
        >
          Update Password
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
