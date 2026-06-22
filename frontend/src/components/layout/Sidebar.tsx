import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import BarChartIcon from '@mui/icons-material/BarChart';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import WatchIcon from '@mui/icons-material/Watch';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
  { label: 'Analytics', icon: <BarChartIcon />, path: '/analytics' },
  { label: 'Import Sheet', icon: <UploadFileIcon />, path: '/import' },
  { label: 'Camera Scan', icon: <CameraAltIcon />, path: '/camera' },
  { label: 'Users', icon: <PeopleIcon />, path: '/users', adminOnly: true },
];

interface SidebarProps {
  open: boolean;
  variant: 'permanent' | 'temporary';
  onClose: () => void;
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <List disablePadding sx={{ px: 1, pt: 1 }}>
      {visibleItems.map((item) => {
        const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
        return (
          <Tooltip key={item.path} title="" placement="right">
            <ListItemButton
              selected={isActive}
              onClick={() => {
                navigate(item.path);
                onNavigate?.();
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                transition: 'all 0.15s ease',
                '&.Mui-selected': {
                  bgcolor: 'secondary.main',
                  color: '#fff',
                  '& .MuiListItemIcon-root': { color: '#fff' },
                  '&:hover': { bgcolor: 'secondary.dark' },
                },
                '&:hover:not(.Mui-selected)': {
                  bgcolor: 'rgba(255,255,255,0.08)',
                  transform: 'translateX(2px)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActive ? 'inherit' : 'rgba(255,255,255,0.6)',
                  transition: 'color 0.15s ease',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.85)',
                }}
              />
            </ListItemButton>
          </Tooltip>
        );
      })}
    </List>
  );
}

function DrawerContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Brand header — sits in the same height slot as the AppBar */}
      <Toolbar disableGutters sx={{ px: 2, gap: 1 }}>
        <WatchIcon sx={{ color: '#e53935', fontSize: 22, flexShrink: 0 }} />
        <Box>
          <Typography
            variant="subtitle2"
            fontWeight={800}
            letterSpacing={1.5}
            sx={{ color: '#e53935', lineHeight: 1.1 }}
            noWrap
          >
            TIMEZONE W.L.L
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', letterSpacing: 0.8 }}
            noWrap
          >
            Inventory System
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <NavList onNavigate={onNavigate} />
      <Box flexGrow={1} />
      <Divider sx={{ mx: 2 }} />
      <Box px={2} py={2}>
        <Box
          display="flex"
          alignItems="center"
          gap={1.5}
          p={1.5}
          borderRadius={2}
          sx={{ bgcolor: 'rgba(255,255,255,0.07)' }}
        >
          <Box>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: 'secondary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
            </Box>
          </Box>
          <Box minWidth={0} flex={1}>
            <Box
              component="p"
              m={0}
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
            </Box>
            <Chip
              label={user?.role ?? 'STAFF'}
              size="small"
              variant="outlined"
              sx={{
                height: 18,
                fontSize: '0.6875rem',
                mt: 0.25,
                borderColor: user?.role === 'ADMIN' ? 'secondary.main' : 'rgba(255,255,255,0.4)',
                color: user?.role === 'ADMIN' ? 'secondary.main' : 'rgba(255,255,255,0.7)',
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function Sidebar({ open, variant, onClose }: SidebarProps) {
  return (
    <Drawer
      variant={variant}
      open={variant === 'permanent' ? true : open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DrawerContent onNavigate={variant === 'temporary' ? onClose : undefined} />
    </Drawer>
  );
}
