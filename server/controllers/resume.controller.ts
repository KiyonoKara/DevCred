import express, { Response, Router } from 'express';
import multer from 'multer';
import {
  createResumeOrPDF,
  deleteResume,
  downloadResume,
  getUserResumes,
  setActiveResume,
} from '../services/resume.service';
import {
  FakeSOSocket,
  ResumeByIdRequest,
  SetActiveResumeRequest,
  UploadResumeRequest,
  UserResumesRequest,
} from '../types/types';

const resumeController = (socket: FakeSOSocket) => {
  const router: Router = express.Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    },
  });

  /**
   * Handles uploading a resume file for a user.
   * Validates file type (PDF only) and size (8MB limit) before saving to database.
   *
   * @param req The UploadResumeRequest object containing userId and resume file.
   * @param res The HTTP response object used to send back the upload result.
   *
   * @returns A Promise that resolves to void.
   */
  const uploadPDFRoute = async (req: UploadResumeRequest, res: Response): Promise<void> => {
    const { userId } = req.body;
    let { isActive = true } = req.body;
    const { isDMFile = false } = req.body;
    const file = req.file;

    // Get isActive from string to boolean if it came as a string from FormData
    if (typeof isActive === 'string') {
      isActive = isActive === 'true' || isActive === '1';
    }

    if (!file) {
      res.status(400).send('No file uploaded');
      return;
    }

    try {
      const resume = await createResumeOrPDF({
        userId,
        fileName: file.originalname,
        fileData: file.buffer,
        contentType: file.mimetype,
        fileSize: file.size,
        uploadDate: new Date(),
        isActive,
        isDMFile: isDMFile,
      });

      if ('error' in resume) {
        throw new Error(resume.error);
      }

      res.status(200).json(resume);
    } catch (error) {
      res.status(500).send(`Error uploading resume: ${error}`);
    }
  };

  /**
   * Retrieves all resumes for a specific user.
   * Returns a list of resume metadata without the actual file data.
   *
   * @param req The UserResumesRequest object containing the userId parameter.
   * @param res The HTTP response object used to send back the list of resumes.
   *
   * @returns A Promise that resolves to void.
   */
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

  /**
   * Downloads a resume file by its ID.
   * Sets appropriate headers for file download and streams the file data.
   *
   * @param req The ResumeByIdRequest object containing the resumeId parameter.
   * @param res The HTTP response object used to send back the file data.
   *
   * @returns A Promise that resolves to void.
   */
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

  /**
   * Deletes a resume by its ID.
   * Permanently removes the resume from the database.
   *
   * @param req The ResumeByIdRequest object containing the resumeId parameter.
   * @param res The HTTP response object used to send back the deletion result.
   *
   * @returns A Promise that resolves to void.
   */
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

  /**
   * Sets a specific resume as the active resume for a user.
   * Deactivates all other resumes for the user and activates the specified one.
   *
   * @param req The SetActiveResumeRequest object containing userId and resumeId.
   * @param res The HTTP response object used to send back the result.
   *
   * @returns A Promise that resolves to void.
   */
  const setActiveResumeRoute = async (
    req: SetActiveResumeRequest,
    res: Response,
  ): Promise<void> => {
    const { userId, resumeId } = req.body;
    try {
      const result = await setActiveResume(userId, resumeId);
      if ('error' in result) throw new Error(result.error);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error setting active resume: ${error}`);
    }
  };

  router.post('/upload', upload.single('resume'), uploadPDFRoute);
  router.get('/user/:userId', getUserResumesRoute);
  router.get('/download/:resumeId', downloadResumeRoute);
  router.delete('/:resumeId', deleteResumeRoute);
  router.put('/setActive', setActiveResumeRoute);

  return router;
};

export default resumeController;
