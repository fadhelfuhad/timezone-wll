import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Outlet } from 'react-router-dom';
import CustomAppBar from './CustomAppBar';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:899px)');
  const { isGuest, logout } = useAuth();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CustomAppBar
        onMenuToggle={() => setDrawerOpen((p) => !p)}
        drawerWidth={DRAWER_WIDTH}
        isMobile={isMobile}
      />
      <Sidebar
        open={drawerOpen}
        variant={isMobile ? 'temporary' : 'permanent'}
        onClose={() => setDrawerOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {isGuest && (
            <Alert
              severity="info"
              sx={{ mb: 2, alignItems: 'center' }}
              action={
                <Button color="inherit" size="small" onClick={() => void logout()} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Log in
                </Button>
              }
            >
              <strong>Guest demo.</strong> Add, edit, import and delete freely. This is sample data, kept
              completely separate from the company's records, and other guests may see your changes.
            </Alert>
          )}
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
