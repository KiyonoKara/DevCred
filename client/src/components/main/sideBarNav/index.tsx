import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useUserContext from '../../../hooks/useUserContext';
import './index.css';

/**
 * The SideBarNav component has a sidebar navigation menu for all the main pages.
 * It highlights the currently selected item based on the active page and
 * triggers corresponding functions when the menu items are clicked.
 */
const SideBarNav = () => {
  const { user } = useUserContext();
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const location = useLocation();

  const toggleOptions = () => {
    setShowOptions(!showOptions);
  };

  const isActiveOption = (path: string) =>
    location.pathname === path ? 'message-option-selected ' : '';

  return (
    <div id='sideBarNav' className='sideBarNav'>
      <NavLink
        to='/home'
        id='menu_questions'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
        Questions
      </NavLink>
      <NavLink
        to='/tags'
        id='menu_tag'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
        Tags
      </NavLink>
      <NavLink
        to='/messaging'
        id='menu_messaging'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}
        onClick={toggleOptions}>
        Messaging
      </NavLink>
      {showOptions && (
        <div className='additional-options'>
          <NavLink
            to='/messaging'
            className={`menu_button message-options ${isActiveOption('/messaging')}`}>
            Global Messages
          </NavLink>
          <NavLink
            to='/messaging/direct-message'
            className={`menu_button message-options ${isActiveOption('/messaging/direct-message')}`}>
            Direct Messages
          </NavLink>
        </div>
      )}
      <NavLink
        to='/users'
        id='menu_users'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
        Users
      </NavLink>
      <NavLink
        to='/games'
        id='menu_games'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
        Games
      </NavLink>
      <NavLink
        to='/communities'
        id='menu_communities'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
        Communities
      </NavLink>
      <NavLink
        to={`/user/${user.username}`}
        id='menu_profile'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
        My Profile
      </NavLink>
      <NavLink
        to={`/collections/${user.username}`}
        id='menu_collections'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
        My Collections
      </NavLink>
      {user.userType === 'recruiter' && (
        <NavLink
          to={`/recruiters/jobposting/${user.username}`}
          id='job_postings'
          className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
          My Job Postings
        </NavLink>
      )}
      <NavLink
        to='/jobboard'
        id='job_board'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
        Job Board
      </NavLink>
      <NavLink
        to='/jobfairs'
        id='job_fairs'
        className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
        Job Fairs
      </NavLink>
      {user.userType === 'talent' && (
        <NavLink
          to={`/jobapplication/${user.username}`}
          id='job_application'
          className={({ isActive }) => `menu_button ${isActive ? 'menu_selected' : ''}`}>
          My Job Applications
        </NavLink>
      )}
    </div>
  );
};

export default SideBarNav;
