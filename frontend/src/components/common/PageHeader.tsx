import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box mb={3}>
      <Box
        display="flex"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        gap={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom={Boolean(subtitle)}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box display="flex" gap={1} flexShrink={0}>{actions}</Box>}
      </Box>
      <Divider />
    </Box>
  );
}
