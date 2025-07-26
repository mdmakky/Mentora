import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Paper,
  IconButton
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Description as PdfIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import api from '../services/api';
import PDFViewer from '../components/PDFViewer';

interface Document {
  id: string;
  title: string;
  upload_date: string;
  total_pages: number;
  topics: string[];
  is_processed: boolean;
}

const StudyPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reader/documents/');
      setDocuments(response.data.documents);
      setError(null);
    } catch (err) {
      setError('Failed to fetch documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.delete(`/reader/documents/${documentId}/delete/`);
      await fetchDocuments(); // Refresh the list
      setError(null);
    } catch (err) {
      setError('Failed to delete document');
      console.error('Error deleting document:', err);
    }
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDoc(document);
    setViewDialogOpen(true);
  };

  const handleViewSummary = async (documentId: string) => {
    try {
      const response = await api.get(`/reader/documents/${documentId}/summary/`);
      // For now, just show an alert with the summary
      // You could create a separate summary dialog component
      alert(`Summary: ${response.data.summary}`);
    } catch (err) {
      setError('Failed to load document summary');
      console.error('Error loading summary:', err);
    }
  };

  const handleCloseViewer = () => {
    setViewDialogOpen(false);
    setSelectedDoc(null);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading your documents...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Study Documents 📚
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage and study your uploaded PDF documents with AI assistance
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {documents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <PdfIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No documents uploaded yet
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Go to the Home page to upload your first PDF document
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {documents.map((doc) => (
            <Box key={doc.id} sx={{ maxWidth: 400 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom noWrap>
                    {doc.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    Pages: {doc.total_pages}
                  </Typography>
                  
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Topics:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {doc.topics.slice(0, 3).map((topic, index) => (
                        <Chip
                          key={index}
                          label={topic}
                          size="small"
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      ))}
                      {doc.topics.length > 3 && (
                        <Chip
                          label={`+${doc.topics.length - 3} more`}
                          size="small"
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      )}
                    </Stack>
                  </Box>
                  
                  <Chip
                    label={doc.is_processed ? "Processed" : "Processing..."}
                    color={doc.is_processed ? "success" : "warning"}
                    size="small"
                  />
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewDocument(doc)}
                    disabled={!doc.is_processed}
                  >
                    View PDF
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleViewSummary(doc.id)}
                    disabled={!doc.is_processed}
                  >
                    Summary
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteDocument(doc.id)}
                    title="Delete document"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Stack>
      )}

      {/* PDF Viewer Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={handleCloseViewer}
        maxWidth="lg"
        fullWidth
        sx={{ '& .MuiDialog-paper': { height: '90vh', maxHeight: '90vh' } }}
      >
        {selectedDoc && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box display="flex" alignItems="center" gap={1}>
                <PdfIcon />
                {selectedDoc.title}
              </Box>
              <IconButton onClick={handleCloseViewer}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, height: '100%' }}>
              <PDFViewer 
                documentId={selectedDoc.id} 
                title={selectedDoc.title}
              />
            </DialogContent>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default StudyPage;
