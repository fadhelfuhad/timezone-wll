import { useState } from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Outlet } from 'react-router-dom';
import CustomAppBar from './CustomAppBar';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:899px)');

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
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
