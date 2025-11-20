import './index.css';
import AskQuestionButton from '../../askQuestionButton';

/**
 * Interface representing the props for the AnswerHeader component.
 *
 * - ansCount - The number of answers to display in the header.
 * - title - The title of the question or discussion thread.
 * - actionButtons - Element for action buttons like editing and deleting.
 */
interface AnswerHeaderProps {
  ansCount: number;
  title: string;
  actionButtons?: React.ReactNode;
}

/**
 * AnswerHeader component that displays a header section for the answer page.
 * It includes the number of answers, the title of the question, and a button to ask a new question.
 *
 * @param ansCount The number of answers to display.
 * @param title The title of the question or discussion thread.
 * @param actionButtons Optional action buttons to display with the title.
 */
const AnswerHeader = ({ ansCount, title, actionButtons }: AnswerHeaderProps) => (
  <div id='answersHeader' className='answers-header right_padding'>
    <div className='answers-header__top'>
      <div className='bold_title answers-header__count'>{ansCount} answers</div>
      <AskQuestionButton />
    </div>
    <div className='answers-header__title-row'>
      <div className='bold_title answer_question_title'>{title}</div>
      {actionButtons}
    </div>
  </div>
);

export default AnswerHeader;
