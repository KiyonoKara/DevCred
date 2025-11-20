import { Outlet } from 'react-router-dom';
import Header from '../header';
import SideBarNav from '../main/sideBarNav';
import './index.css';
import NotificationBanner from '../main/notificationBanner';
import useNotifications from '../../hooks/useNotifications';

/**
 * Main component represents the layout of the main page, including a sidebar and the main content area.
 */
const Layout = () => {
  const { showNotification, handleDismissNotification } = useNotifications();

  return (
    <>
      <Header />
      <div id='main' className='main'>
        <SideBarNav />
        <div id='right_main' className='right_main'>
          <Outlet />
        </div>
      </div>
      <NotificationBanner notification={showNotification} onDismiss={handleDismissNotification} />
    </>
  );
};

export default Layout;
