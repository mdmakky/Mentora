import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Paper,
  Toolbar,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon
} from '@mui/icons-material';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  documentId: string;
  title: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ documentId, title }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = `http://localhost:8001/api/reader/documents/${documentId}/file/`;

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    setLoading(false);
    setError('Failed to load PDF document');
    console.error('PDF load error:', error);
  }

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.25));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper elevation={1}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOutIcon />
            </IconButton>
            <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </Typography>
            <IconButton onClick={zoomIn} disabled={scale >= 3.0}>
              <ZoomInIcon />
            </IconButton>
            
            <Box sx={{ mx: 2, borderLeft: 1, borderColor: 'divider', height: '24px' }} />
            
            <IconButton onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <PrevIcon />
            </IconButton>
            <Typography variant="body2" sx={{ minWidth: '100px', textAlign: 'center' }}>
              {loading ? '...' : `${pageNumber} of ${numPages}`}
            </Typography>
            <IconButton onClick={goToNextPage} disabled={pageNumber >= numPages}>
              <NextIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </Paper>

      {/* PDF Content */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          p: 2,
          bgcolor: 'grey.100'
        }}
      >
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
            <CircularProgress size={60} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading PDF...
            </Typography>
          </Box>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          error=""
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </Box>
    </Box>
  );
};

export default PDFViewer;
