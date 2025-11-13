import './index.css';
import QuestionHeader from './header';
import QuestionView from './question';
import PaginationControls from '../userActivityPage/PaginationControls';
import useQuestionPage from '../../../hooks/useQuestionPage';

/**
 * QuestionPage component renders a page displaying a list of questions
 * based on filters such as order and search terms.
 * It includes a header with order buttons and a button to ask a new question.
 */
const QuestionPage = () => {
  const {
    titleText,
    qlist,
    paginatedQuestions,
    currentPage,
    totalPages,
    setQuestionOrder,
    setCurrentPage,
  } = useQuestionPage();

  return (
    <>
      <QuestionHeader
        titleText={titleText}
        qcnt={qlist.length}
        setQuestionOrder={setQuestionOrder}
      />
      <div id='question_list' className='question_list'>
        {paginatedQuestions.map(q => (
          <QuestionView question={q} key={q._id.toString()} />
        ))}
      </div>

      {titleText === 'Search Results' && !qlist.length && (
        <div className='bold_title right_padding'>No Questions Found</div>
      )}
      {qlist.length > 20 && (
        <div className='question-pagination'>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </>
  );
};

export default QuestionPage;
