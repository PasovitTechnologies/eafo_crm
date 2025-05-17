import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups } from '../api';
import CreateGroup from './CreateGroup';

function GroupList() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getGroups();
        console.log('Fetched groups:', data);
        setGroups(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch groups');
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleGroupCreated = () => {
    setIsModalOpen(false);
    const fetchGroups = async () => {
      try {
        const data = await getGroups();
        setGroups(data);
      } catch (err) {
        setError('Failed to fetch groups');
      }
    };
    fetchGroups();
  };

  const handleRowClick = (groupid) => {
    navigate(`/exams/candidates/${groupid}`);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="group-list">
      <div className="group-list-header">
        <h2>Groups</h2>
        <button onClick={() => setIsModalOpen(true)}>Create New Group</button>
      </div>
      {groups.length === 0 ? (
        <p>No groups found</p>
      ) : (
        <table className="group-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Candidates</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <tr
                key={group.groupid}
                onClick={() => handleRowClick(group.groupid)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && handleRowClick(group.groupid)}
                aria-label={`View candidates for ${group.group}`}
              >
                <td>{group.group}</td>
                <td>{group.description}</td>
                <td>{group.totalcandidates}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={() => setIsModalOpen(false)} aria-label="Close modal">
              ✕
            </button>
            <CreateGroup onGroupCreated={handleGroupCreated} closeModal={() => setIsModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupList;