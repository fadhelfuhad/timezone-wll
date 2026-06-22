import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InboxIcon from '@mui/icons-material/Inbox';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      py={8}
      px={2}
    >
      <Box sx={{ color: 'text.disabled', fontSize: 0 }}>
        {icon ?? <InboxIcon sx={{ fontSize: 64, opacity: 0.4 }} />}
      </Box>
      <Typography variant="h6" fontWeight={600} color="text.secondary" textAlign="center">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.disabled" textAlign="center" maxWidth={360}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
