import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WatchIcon from '@mui/icons-material/Watch';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Shared dark-glass TextField sx to avoid repetition
const darkFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.9)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(201,168,76,0.5)' },
    '&.Mui-focused fieldset': { borderColor: '#c9a84c' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#c9a84c' },
  '& .MuiFormHelperText-root': { color: '#f44336' },
} as const;

export default function Login() {
  const { login, loginAsGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onGuest = async () => {
    setErrorMessage(null);
    setGuestLoading(true);
    try {
      await loginAsGuest();
      navigate('/dashboard', { replace: true });
    } catch {
      setErrorMessage('The guest demo is unavailable right now. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      await login(values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const apiMessage =
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : null;
      setErrorMessage(apiMessage ?? 'Invalid credentials. Please try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d5e 100%)',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Radial gold glow */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(201,168,76,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      {/* Decorative rings */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          width: 480,
          height: 480,
          borderRadius: '50%',
          border: '1px solid rgba(201,168,76,0.07)',
          top: '5%',
          right: '8%',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          width: 680,
          height: 680,
          borderRadius: '50%',
          border: '1px solid rgba(201,168,76,0.04)',
          bottom: '-8%',
          left: '5%',
          pointerEvents: 'none',
        }}
      />

      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,76,0.15)',
          bgcolor: 'rgba(18,18,31,0.97)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1,
          overflow: 'visible',
        }}
      >
        {/* Top gold accent bar */}
        <Box
          sx={{
            height: 3,
            background: 'linear-gradient(90deg, #a8893c, #c9a84c, #d9bc72, #c9a84c, #a8893c)',
            borderRadius: '12px 12px 0 0',
          }}
        />

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Brand / logo area */}
          <Box textAlign="center" mb={3.5}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #c9a84c 0%, #d9bc72 100%)',
                mb: 2.5,
                boxShadow: '0 8px 28px rgba(201,168,76,0.4)',
              }}
            >
              <WatchIcon sx={{ fontSize: 34, color: '#1a1a2e' }} />
            </Box>

            <Typography
              variant="h5"
              fontWeight={800}
              letterSpacing={2.5}
              sx={{ color: '#c9a84c', lineHeight: 1.1, mb: 0.75 }}
            >
              TIMEZONE W.L.L
            </Typography>

            <Typography
              variant="caption"
              letterSpacing={1.8}
              sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}
            >
              Inventory Management System
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)', mb: 3 }} />

          {/* Error alert */}
          {errorMessage && (
            <Alert
              severity="error"
              onClose={() => setErrorMessage(null)}
              sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8125rem' }}
            >
              {errorMessage}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Box mb={2}>
                  <Typography
                    variant="caption"
                    component="label"
                    sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, mb: 0.75, display: 'block', textTransform: 'uppercase', fontSize: '0.7rem' }}
                  >
                    Email Address
                  </Typography>
                  <TextField
                    {...field}
                    placeholder="Enter your email"
                    type="email"
                    fullWidth
                    autoComplete="email"
                    autoFocus
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message}
                    sx={darkFieldSx}
                  />
                </Box>
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Box mb={3}>
                  <Typography
                    variant="caption"
                    component="label"
                    sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, mb: 0.75, display: 'block', textTransform: 'uppercase', fontSize: '0.7rem' }}
                  >
                    Password
                  </Typography>
                  <TextField
                    {...field}
                    placeholder="Enter your password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    autoComplete="current-password"
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          sx={{
                            color: 'rgba(255,255,255,0.35)',
                            '&:hover': { color: '#c9a84c' },
                          }}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={darkFieldSx}
                />
                </Box>
              )}
            />

            <LoadingButton
              type="submit"
              fullWidth
              variant="contained"
              loading={isSubmitting}
              size="large"
              sx={{
                background: 'linear-gradient(135deg, #c9a84c 0%, #d9bc72 100%)',
                color: '#1a1a2e',
                fontWeight: 800,
                letterSpacing: 1.8,
                fontSize: '0.9375rem',
                py: 1.6,
                textTransform: 'uppercase',
                boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #b8943f 0%, #c9a84c 100%)',
                  boxShadow: '0 6px 28px rgba(201,168,76,0.6)',
                  transform: 'translateY(-1px)',
                },
                '&:active': { transform: 'translateY(0)' },
                '&.MuiLoadingButton-loading': {
                  background: 'rgba(201,168,76,0.3)',
                  transform: 'none',
                },
              }}
            >
              Sign In
            </LoadingButton>
          </Box>

          <Box display="flex" alignItems="center" gap={1.5} my={2.5}>
            <Box flex={1} height="1px" bgcolor="rgba(255,255,255,0.1)" />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>
              OR
            </Typography>
            <Box flex={1} height="1px" bgcolor="rgba(255,255,255,0.1)" />
          </Box>

          <LoadingButton
            fullWidth
            variant="outlined"
            size="large"
            loading={guestLoading}
            onClick={() => void onGuest()}
            sx={{
              color: '#d9bc72',
              borderColor: 'rgba(201,168,76,0.45)',
              fontWeight: 700,
              letterSpacing: 1.2,
              py: 1.3,
              '&:hover': { borderColor: '#c9a84c', bgcolor: 'rgba(201,168,76,0.08)' },
            }}
          >
            Continue as guest
          </LoadingButton>
          <Typography variant="caption" display="block" textAlign="center" mt={1.25} sx={{ color: 'rgba(255,255,255,0.4)' }}>
            Try the full app on sample data. It's separate from the company's records.
          </Typography>

          <Typography
            variant="caption"
            display="block"
            textAlign="center"
            mt={3}
            sx={{ color: 'rgba(255,255,255,0.18)' }}
          >
            Timezone W.L.L — Inventory System v1.0
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
