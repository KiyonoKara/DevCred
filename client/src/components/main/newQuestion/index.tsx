import useNewQuestion from '../../../hooks/useNewQuestion';
import Form from '../baseComponents/form';
import Input from '../baseComponents/input';
import TextArea from '../baseComponents/textarea';
import './index.css';

/**
 * NewQuestionPage component allows users to submit a new question with a title,
 * description, tags, and username.
 */
const NewQuestionPage = () => {
  const {
    title,
    setTitle,
    text,
    setText,
    tagNames,
    setTagNames,
    communitySearch,
    setCommunitySearch,
    handleCommunitySearch,
    searchResults,
    handleSelectCommunity,
    handleClearCommunity,
    searchPerformed,
    selectedCommunity,
    topJoinedCommunities,
    titleErr,
    textErr,
    tagErr,
    postQuestion,
  } = useNewQuestion();

  return (
    <Form>
      <Input
        title={'Question Title'}
        hint={'Limit title to 100 characters or less'}
        id={'formTitleInput'}
        val={title}
        setState={setTitle}
        err={titleErr}
      />
      <TextArea
        title={'Question Text'}
        hint={'Add details'}
        id={'formTextInput'}
        val={text}
        setState={setText}
        err={textErr}
      />
      <h5>
        <i>Markdown formatting is supported.</i>
      </h5>
      <Input
        title={'Tags'}
        hint={'Add keywords separated by whitespace'}
        id={'formTagInput'}
        val={tagNames}
        setState={setTagNames}
        err={tagErr}
      />
      <div className='input_title'>Community</div>
      <div className='community-search-bar'>
        <input
          className='community-search-input'
          type='text'
          placeholder='Search by community name'
          value={communitySearch}
          onChange={event => setCommunitySearch(event.target.value)}
        />
        <button className='community-search-button' type='button' onClick={handleCommunitySearch}>
          Search
        </button>
      </div>
      {selectedCommunity && (
        <div className='selected-community'>
          Selected community:{' '}
          <span className='selected-community__name'>{selectedCommunity.name}</span>
          <button type='button' className='clear-community-button' onClick={handleClearCommunity}>
            Clear
          </button>
        </div>
      )}
      <div className='joined-communities'>
        {topJoinedCommunities.map(com => (
          <button
            key={com._id.toString()}
            type='button'
            className={`joined-community-chip ${
              selectedCommunity?._id.toString() === com._id.toString() ? 'selected' : ''
            }`}
            onClick={() => handleSelectCommunity(com)}>
            {com.name}
          </button>
        ))}
        {topJoinedCommunities.length === 0 && (
          <div className='community-search-empty'>You have not joined any communities yet.</div>
        )}
      </div>
      {searchPerformed && (
        <div className='community-suggestions'>
          <h5 className='community-suggestions__title'>Suggested communities</h5>
          {searchResults.length === 0 ? (
            <div className='community-search-empty'>No communities found.</div>
          ) : (
            <ul className='community-suggestion-list'>
              {searchResults.map(com => (
                <li key={com._id.toString()}>
                  <button
                    type='button'
                    className={`community-suggestion-item ${
                      selectedCommunity?._id.toString() === com._id.toString() ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectCommunity(com)}>
                    <span className='community-suggestion-name'>{com.name}</span>
                    <span className='community-suggestion-meta'>
                      {com.participants.length} members · {com.visibility.toLowerCase()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className='btn_indicator_container'>
        <button
          className='form_postBtn'
          onClick={() => {
            postQuestion();
          }}>
          Post Question
        </button>
        <div className='mandatory_indicator'>* indicates mandatory fields</div>
      </div>
    </Form>
  );
};

export default NewQuestionPage;
