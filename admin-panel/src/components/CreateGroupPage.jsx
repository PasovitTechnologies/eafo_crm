import CreateGroup from '../components/CreateGroup';
import './create-group.css';

function CreateGroupPage() {
  return (
      <div className="container">
        <CreateGroup onGroupCreated={() => window.location.href = '/'} closeModal={() => {}} />
      </div>
  );
}

export default CreateGroupPage;