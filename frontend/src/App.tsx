import { RouterProvider } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { router } from './router';
import { AuthProvider } from './contexts/AuthContext';
import { ColorModeProvider } from './contexts/ColorModeContext';

export default function App() {
  return (
    <ColorModeProvider>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={4000}
      >
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </SnackbarProvider>
    </ColorModeProvider>
  );
}
