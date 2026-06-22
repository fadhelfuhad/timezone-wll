import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorMessageProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorMessage({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorMessageProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      py={6}
      px={2}
    >
      <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main', opacity: 0.8 }} />
      <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={360}>
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          size="small"
          sx={{ mt: 1 }}
        >
          Retry
        </Button>
      )}
    </Box>
  );
}
