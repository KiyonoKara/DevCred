import express, { Response, Router } from 'express';
import multer from 'multer';
import { FakeSOSocket } from '../types/types';
import {
  UploadResumeRequest,
  ResumeByIdRequest,
  UserResumesRequest,
  SetActiveResumeRequest,
} from '../types/types';
import {
  createResume,
  getUserResumes,
  downloadResume,
  deleteResume,
  setActiveResume,
} from '../services/resume.service';

const resumeController = (socket: FakeSOSocket) => {
  const router: Router = express.Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    },
  });

  const uploadResumeRoute = async (req: UploadResumeRequest, res: Response): Promise<void> => {
    const { userId, isActive = true } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).send('No file uploaded');
      return;
    }

    try {
      const resume = await createResume({
        userId,
        fileName: file.originalname,
        fileData: file.buffer,
        contentType: file.mimetype,
        fileSize: file.size,
        uploadDate: new Date(),
        isActive,
      });

      if ('error' in resume) {
        throw new Error(resume.error);
      }

      res.status(200).json(resume);
    } catch (error) {
      res.status(500).send(`Error uploading resume: ${error}`);
    }
  };

  const getUserResumesRoute = async (req: UserResumesRequest, res: Response): Promise<void> => {
    const { userId } = req.params;
    try {
      const resumes = await getUserResumes(userId);
      if ('error' in resumes) throw new Error(resumes.error);
      res.status(200).json(resumes);
    } catch (error) {
      res.status(500).send(`Error getting resumes: ${error}`);
    }
  };

  const downloadResumeRoute = async (req: ResumeByIdRequest, res: Response): Promise<void> => {
    const { resumeId } = req.params;
    try {
      const result = await downloadResume(resumeId);
      if ('error' in result) throw new Error(result.error);
      
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.fileData);
    } catch (error) {
      res.status(500).send(`Error downloading resume: ${error}`);
    }
  };

  const deleteResumeRoute = async (req: ResumeByIdRequest, res: Response): Promise<void> => {
    const { resumeId } = req.params;
    try {
      const result = await deleteResume(resumeId);
      if ('error' in result) throw new Error(result.error);
      res.status(200).json({ message: 'Resume deleted successfully' });
    } catch (error) {
      res.status(500).send(`Error deleting resume: ${error}`);
    }
  };

  const setActiveResumeRoute = async (req: SetActiveResumeRequest, res: Response): Promise<void> => {
    const { userId, resumeId } = req.body;
    try {
      const result = await setActiveResume(userId, resumeId);
      if ('error' in result) throw new Error(result.error);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error setting active resume: ${error}`);
    }
  };

  router.post('/upload', upload.single('resume'), uploadResumeRoute);
  router.get('/user/:userId', getUserResumesRoute);
  router.get('/download/:resumeId', downloadResumeRoute);
  router.delete('/:resumeId', deleteResumeRoute);
  router.put('/setActive', setActiveResumeRoute);

  return router;
};

export default resumeController;