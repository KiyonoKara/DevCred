import useTagPage from '../../../hooks/useTagPage';
import AskQuestionButton from '../askQuestionButton';
import './index.css';
import TagView from './tag';

/**
 * Represents the TagPage component which displays a list of tags
 * and provides functionality to handle tag clicks and ask a new question.
 */
const TagPage = () => {
  const { tlist, clickTag } = useTagPage();

  return (
    <>
      <div className='tags-header'>
        <div className='tag-count'>{tlist.length} Tags</div>
        <div className='bold_title'>All Tags</div>
        <AskQuestionButton />
      </div>
      <div className='tag_list right_padding'>
        {tlist.map(t => (
          <TagView key={t.name} t={t} clickTag={clickTag} />
        ))}
      </div>
    </>
  );
};

export default TagPage;
