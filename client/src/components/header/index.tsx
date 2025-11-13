import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import useHeader from '../../hooks/useHeader';
import './index.css';
import useUserContext from '../../hooks/useUserContext';

/**
 * Header component that renders the main title and a search bar.
 * The search bar allows the user to input a query and navigate to the search results page
 * when they press Enter.
 */
const Header = () => {
  const { val, handleInputChange, handleKeyDown, handleSignOut } = useHeader();
  const { user: currentUser } = useUserContext();
  const navigate = useNavigate();
  const isRecruiter = currentUser.userType === 'recruiter';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsDropdownOpen(false);
  };

  return (
    <div id='header' className='header'>
      <div></div>
      <div className='title'>Fake Stack Overflow</div>
      <input
        id='searchBar'
        placeholder='Search ...'
        type='text'
        value={val}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      {/* Dropdown menu for job postings and fairs, only shown if user is a recruiter */}
      {isRecruiter && (
        <div className='create-dropdown' ref={dropdownRef}>
          <button
            className='create-dropdown-button'
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title='Create new job opportunities'>
            + Create
          </button>
          {isDropdownOpen && (
            <div className='dropdown-menu'>
              <button
                className='dropdown-item'
                onClick={() => handleNavigate('/recruiters/jobposting/new')}>
                + Create Job Posting
              </button>
              <button
                className='dropdown-item'
                onClick={() => handleNavigate('/recruiters/jobfairs/new')}>
                + Create Job Fair
              </button>
            </div>
          )}
        </div>
      )}

      <button onClick={handleSignOut} className='logout-button'>
        Log out
      </button>
      <button
        className='view-profile-button'
        onClick={() => navigate(`/user/${currentUser.username}`)}>
        View Profile
      </button>
    </div>
  );
};

export default Header;
