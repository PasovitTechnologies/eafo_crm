import { useState } from 'react';
import { createGroup } from '../api';
import "./create-group.css";


function CreateGroup({ onGroupCreated, closeModal }) {
  const [groupname, setGroupname] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createGroup({ groupname, description });
      setLoading(false);
      onGroupCreated(); // Notify parent to refetch groups and close modal
    } catch (err) {
      setError('Failed to create group');
      setLoading(false);
    }
  };

  return (
    <div className="create-group">
      <h2>Create New Group</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="groupname">Group Name</label>
          <input
            type="text"
            id="groupname"
            value={groupname}
            onChange={(e) => setGroupname(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </div>
  );
}

export default CreateGroup;