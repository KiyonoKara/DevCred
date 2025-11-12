import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJobPosting } from '../services/jobPostingService';
import { DatabaseJobPosting, JobType, Tag } from '../types/types';
import useUserContext from './useUserContext';

const useRecruitersNewJobPostingPage = () => {
  const { user } = useUserContext();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [payRange, setPayRange] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [active, setActive] = useState<boolean>(false);
  const [deadline, setDeadline] = useState<string>('');
  const [tags, setTags] = useState<string>('');

  const handleCreateJobPosting = async () => {
    try {
      let dateObject: Date | null = null;
      let tagObjs: Tag[] | null = null;

      if (!(!!company && !!title && !!description && !!location)) {
        throw new Error('Missing required fields, please finish form before submission!');
      }

      if (deadline) {
        const dateSplit = deadline.split('/');
        if (dateSplit.length !== 3) {
          throw new Error(
            'Invalid date format for deadline. Please fix or remove before submitting',
          );
        }
        dateObject = new Date(Number(dateSplit[2]), Number(dateSplit[0]) - 1, Number(dateSplit[1]));
      }

      if (tags) {
        const tagnames = tags.split(' ').filter(tagName => tagName.trim() !== '');
        tagObjs = tagnames.map(tagName => ({
          name: tagName,
          description: 'user added tag',
        }));
      }

      const jobPosting: DatabaseJobPosting = await createJobPosting({
        company: company,
        recruiter: user.username,
        title: title,
        ...(payRange ? { payRange: payRange } : {}),
        description: description,
        location: location,
        ...(jobType ? { jobType: jobType } : {}),
        tags: tagObjs ? tagObjs : [],
        active: active,
        ...(dateObject ? { deadline: dateObject } : {}),
      });

      if (jobPosting) {
        navigate(`/recruiters/jobposting/${jobPosting._id}/applications`);
      }
    } catch (err) {
      setError('Error while creating job posting: ' + (err as Error).message);
    }
  };

  return {
    error,
    company,
    setCompany,
    title,
    setTitle,
    payRange,
    setPayRange,
    description,
    setDescription,
    location,
    setLocation,
    jobType,
    setJobType,
    active,
    setActive,
    deadline,
    setDeadline,
    tags,
    setTags,
    handleCreateJobPosting,
  };
};

export default useRecruitersNewJobPostingPage;
