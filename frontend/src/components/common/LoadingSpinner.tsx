import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

interface LoadingSpinnerProps {
  message?: string;
  fullscreen?: boolean;
  size?: number;
}

export default function LoadingSpinner({
  message,
  fullscreen = false,
  size = 40,
}: LoadingSpinnerProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      sx={
        fullscreen
          ? { position: 'fixed', inset: 0, zIndex: 9999, bgcolor: 'background.default' }
          : { py: 4 }
      }
    >
      <CircularProgress size={size} color="primary" thickness={4} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}
