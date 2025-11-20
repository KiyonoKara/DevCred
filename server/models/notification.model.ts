import mongoose from 'mongoose';
import notificationSchema from './schema/notification.schema';

const NotificationModel = mongoose.model('Notification', notificationSchema);

export default NotificationModel;
