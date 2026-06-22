import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Box, Paper, Stack, Typography, Button, Alert, LinearProgress,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, IconButton,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import { uploadFile, approveImport } from '../api/imports.api';
import type { InventoryImport, ImportRow } from '../types';

type Phase = 'idle' | 'camera' | 'preview' | 'done';

function getField(row: ImportRow, field: string): string {
  const pd = row.parsedData as Record<string, unknown> | undefined;
  if (pd && pd[field] != null) return String(pd[field]);
  const rd = row.rawData as Record<string, unknown> | undefined;
  if (rd && rd[field] != null) return String(rd[field]);
  return '';
}

export default function Camera() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [importRecord, setImportRecord] = useState<InventoryImport | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(msg);
      setPhase('idle');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (phase === 'camera') {
      startCamera(facingMode);
    }
    return () => {
      if (phase !== 'camera') stopCamera();
    };
  }, [phase, facingMode, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      stopCamera();
      setCapturedBlob(blob);
      const url = URL.createObjectURL(blob);
      setCapturedUrl(url);
      setPhase('preview');
    }, 'image/jpeg', 0.92);
  };

  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file),
    onSuccess: (data) => {
      setImportRecord(data);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'OCR failed';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, rows }: { id: string; rows: string[] }) =>
      approveImport(id, rows.map((rowId) => ({ rowId }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setPhase('done');
      enqueueSnackbar('Items added to inventory!', { variant: 'success' });
    },
  });

  const processCapture = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    uploadMutation.mutate(file);
  };

  const retake = () => {
    setCapturedBlob(null);
    if (capturedUrl) { URL.revokeObjectURL(capturedUrl); setCapturedUrl(null); }
    setImportRecord(null);
    setPhase('camera');
  };

  const rows: ImportRow[] = importRecord?.importRows ?? [];

  return (
    <Box>
      <PageHeader title="Camera Scan" subtitle="Capture inventory sheets using your device camera" />

      {phase === 'idle' && (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', maxWidth: 480, borderRadius: 3 }}>
          <CameraAltIcon sx={{ fontSize: 72, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" fontWeight={600} mb={1}>Use Camera to Scan</Typography>
          <Typography color="text.secondary" mb={3}>
            Point your camera at an inventory sheet or label. OCR will extract the data for review.
          </Typography>
          {cameraError && <Alert severity="error" sx={{ mb: 2 }}>{cameraError}</Alert>}
          <Button variant="contained" size="large" startIcon={<CameraAltIcon />} onClick={() => setPhase('camera')}>
            Open Camera
          </Button>
        </Paper>
      )}

      {phase === 'camera' && (
        <Box sx={{ maxWidth: 640 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover' }}
            />
            <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
              <IconButton onClick={flipCamera} sx={{ bgcolor: 'rgba(0,0,0,0.4)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
                <FlipCameraAndroidIcon />
              </IconButton>
            </Box>
          </Paper>
          <Stack direction="row" spacing={2} mt={2} justifyContent="center">
            <Button variant="outlined" onClick={() => { stopCamera(); setPhase('idle'); }}>Cancel</Button>
            <Button variant="contained" size="large" startIcon={<CameraAltIcon />} onClick={captureFrame}>
              Capture
            </Button>
          </Stack>
        </Box>
      )}

      {phase === 'preview' && (
        <Box sx={{ maxWidth: 800 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
            {capturedUrl && (
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', flexShrink: 0, width: { xs: '100%', md: 280 } }}>
                <img src={capturedUrl} alt="Captured" style={{ width: '100%', display: 'block' }} />
              </Paper>
            )}
            <Box flex={1}>
              <Typography fontWeight={600} mb={1}>Captured Image</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Click "Extract Data" to run OCR and parse inventory rows from the image.
              </Typography>
              {uploadMutation.isPending && (
                <Box>
                  <Typography variant="body2" mb={0.5}>Running OCR…</Typography>
                  <LinearProgress />
                </Box>
              )}
              {!importRecord && !uploadMutation.isPending && (
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={retake}>Retake</Button>
                  <Button variant="contained" onClick={processCapture}>Extract Data</Button>
                </Stack>
              )}
              {importRecord && (
                <Alert severity="success">
                  Extracted {rows.length} rows. Review below and approve to add to inventory.
                </Alert>
              )}
            </Box>
          </Stack>

          {importRecord && rows.length > 0 && (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Brand</TableCell>
                      <TableCell>Model</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">Sale</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{getField(row, 'brand') || '—'}</TableCell>
                        <TableCell>{getField(row, 'model') || '—'}</TableCell>
                        <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{getField(row, 'description') || '—'}</Typography></TableCell>
                        <TableCell align="right">{getField(row, 'quantity') || '1'}</TableCell>
                        <TableCell align="right">{getField(row, 'costPrice') ? Number(getField(row, 'costPrice')).toFixed(3) : '—'}</TableCell>
                        <TableCell align="right">{getField(row, 'salePrice') ? Number(getField(row, 'salePrice')).toFixed(3) : '—'}</TableCell>
                        <TableCell><Chip label={row.status} size="small" color={row.status === 'APPROVED' ? 'success' : 'warning'} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction="row" spacing={2}>
                <Button variant="outlined" onClick={retake}>Retake</Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => approveMutation.mutate({ id: importRecord.id, rows: rows.map((r) => r.id) })}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Approving…' : `Approve (${rows.length} items)`}
                </Button>
              </Stack>
            </>
          )}
        </Box>
      )}

      {phase === 'done' && (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', maxWidth: 480, borderRadius: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} mb={1}>Items Added!</Typography>
          <Typography color="text.secondary" mb={3}>All extracted items have been added to inventory.</Typography>
          <Button variant="contained" onClick={() => { setPhase('idle'); setImportRecord(null); setCapturedBlob(null); setCapturedUrl(null); }}>
            Scan Another
          </Button>
        </Paper>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Box>
  );
}
