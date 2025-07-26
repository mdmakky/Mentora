import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import { Add, Upload, MenuBook, Chat, Analytics } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';
import { getDocuments, uploadDocument, Document } from '../services/api';

const HomePage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setUploadFile(file);
        setDocumentTitle(file.name.replace('.pdf', ''));
        setUploadDialogOpen(true);
      }
    },
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await getDocuments();
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !documentTitle.trim()) return;

    setUploading(true);
    try {
      await uploadDocument(uploadFile, documentTitle);
      setUploadDialogOpen(false);
      setUploadFile(null);
      setDocumentTitle('');
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to Mentora! 🎓
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Your AI-powered study companion for smarter learning
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Stack spacing={3} direction={{ xs: 'column', md: 'row' }} sx={{ mb: 4 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MenuBook sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Smart PDF Reader</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Upload PDFs and get AI-powered summaries, topic detection, and smart navigation.
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small" onClick={() => setUploadDialogOpen(true)} startIcon={<Upload />}>
              Upload PDF
            </Button>
          </CardActions>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chat sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">AI Study Chat</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Ask questions about your study materials and get instant, intelligent answers.
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small" component={Link} to="/chat">
              Start Chatting
            </Button>
          </CardActions>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Analytics sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Study Analytics</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Track your progress, identify weak areas, and get personalized study recommendations.
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small" component={Link} to="/analytics">
              View Analytics
            </Button>
          </CardActions>
        </Card>
      </Stack>

      {/* Recent Documents */}
      <Typography variant="h5" component="h2" gutterBottom>
        Your Documents ({documents.length})
      </Typography>
      
      {documents.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No documents uploaded yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload your first PDF to get started with AI-powered studying!
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<Upload />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {documents.map((doc) => (
            <Card key={doc.id} sx={{ minWidth: 300, maxWidth: 350 }}>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom noWrap>
                  {doc.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {doc.total_pages} pages • Uploaded {formatDate(doc.upload_date)}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {doc.topics.slice(0, 3).map((topic, index) => (
                    <Chip
                      key={index}
                      label={topic}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                  {doc.topics.length > 3 && (
                    <Chip
                      label={`+${doc.topics.length - 3} more`}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                      variant="outlined"
                    />
                  )}
                </Box>
                {!doc.is_processed && (
                  <Box sx={{ mt: 1 }}>
                    <Chip label="Processing..." color="warning" size="small" />
                  </Box>
                )}
              </CardContent>
              <CardActions>
                <Button size="small" component={Link} to={`/study?doc=${doc.id}`}>
                  Study
                </Button>
                <Button size="small" component={Link} to={`/chat?doc=${doc.id}`}>
                  Chat
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Upload FAB */}
      <Fab
        color="primary"
        aria-label="upload"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setUploadDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload PDF Document</DialogTitle>
        <DialogContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              cursor: 'pointer',
              mb: 2,
            }}
          >
            <input {...getInputProps()} />
            {uploadFile ? (
              <Typography>Selected: {uploadFile.name}</Typography>
            ) : (
              <Typography>
                {isDragActive
                  ? 'Drop the PDF here...'
                  : 'Drag & drop a PDF file here, or click to select'}
              </Typography>
            )}
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="Document Title"
            fullWidth
            variant="outlined"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained"
            disabled={!uploadFile || !documentTitle.trim() || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HomePage;
