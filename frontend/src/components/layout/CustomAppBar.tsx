import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PersonIcon from '@mui/icons-material/Person';
import WatchIcon from '@mui/icons-material/Watch';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useColorMode } from '../../contexts/ColorModeContext';

interface CustomAppBarProps {
  onMenuToggle: () => void;
  drawerWidth: number;
  isMobile: boolean;
}

export default function CustomAppBar({ onMenuToggle, drawerWidth, isMobile }: CustomAppBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { colorMode, toggleColorMode } = useColorMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?';
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Guest';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleProfile = () => {
    handleMenuClose();
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        width: { md: isMobile ? '100%' : `calc(100% - ${drawerWidth}px)` },
        ml: { md: isMobile ? 0 : `${drawerWidth}px` },
        transition: (theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
      }}
    >
      <Toolbar>
        {/* Hamburger — mobile only */}
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={onMenuToggle}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Brand — shown on mobile only (desktop sidebar already has it) */}
        <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
          {isMobile && (
            <>
              <WatchIcon sx={{ color: '#e53935', fontSize: 22 }} />
              <Typography
                variant="subtitle1"
                fontWeight={700}
                letterSpacing={1.5}
                sx={{ color: '#e53935', lineHeight: 1 }}
                noWrap
              >
                TIMEZONE W.L.L
              </Typography>
            </>
          )}
        </Box>

        {/* Right-side actions */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <Tooltip title={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <IconButton color="inherit" onClick={toggleColorMode} size="small">
              {colorMode === 'light' ? (
                <DarkModeIcon fontSize="small" />
              ) : (
                <LightModeIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton color="inherit" size="small">
              <NotificationsNoneIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={displayName}>
            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 0.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: 'secondary.main',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* User dropdown */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { mt: 1, minWidth: 180, borderRadius: 2 }, elevation: 4 }}
        >
          <Box px={2} py={1}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
