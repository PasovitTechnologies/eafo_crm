import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, getAllCandidates } from '../api';
import CreateGroup from './CreateGroup';

function GroupList() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [candidateMap, setCandidateMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroupsAndCandidates = async () => {
      try {
        // Fetch groups
        const groupData = await getGroups();
        console.log('Fetched groups:', groupData);
        setGroups(groupData);

        // Fetch all candidates
        const candidates = await getAllCandidates();
        console.log('Fetched all candidates:', candidates);

        // Create a lookup for group names to group IDs
        const groupNameToId = {};
        groupData.forEach(group => {
          groupNameToId[group.group] = String(group.groupid);
        });
        console.log('Group name to ID mapping:', groupNameToId);

        // Build group-to-candidate mapping
        const map = {};
        candidates.forEach(candidate => {
          const groupName = candidate.group;
          const primaryGroupId = groupNameToId[groupName] || null;
          console.log(`Candidate ${candidate.email}: groupName=${groupName}, inferred primaryGroupId=${primaryGroupId}`);

          const additionalGroupIds = candidate.additiongroupsIds
            ? candidate.additiongroupsIds.split(',').map(id => id.trim())
            : [];
          console.log(`Candidate ${candidate.email}: additionalGroupIds=`, additionalGroupIds);

          if (primaryGroupId) {
            if (!map[primaryGroupId]) map[primaryGroupId] = [];
            map[primaryGroupId].push(candidate);
            console.log(`Added ${candidate.email} to group ${primaryGroupId}`);
          } else {
            console.log(`No primary group ID found for candidate ${candidate.email}, groupName=${groupName}`);
          }

          additionalGroupIds.forEach(groupId => {
            if (groupId) {
              if (!map[groupId]) map[groupId] = [];
              map[groupId].push(candidate);
              console.log(`Added ${candidate.email} to additional group ${groupId}`);
            }
          });
        });

        console.log('Final group-to-candidate map:', map);
        setCandidateMap(map);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching groups or candidates:', err);
        setError('Failed to fetch groups or candidates');
        setLoading(false);
      }
    };
    fetchGroupsAndCandidates();
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
    navigate(`/exams/candidates/${groupid}`, {
      state: { candidateMap },
      replace: true, // ✅ replaces current history entry
    });
  };
  

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="group-list">
      <div className="group-list-header">
        <h2>Groups</h2>
        <button className='exam-button' onClick={() => setIsModalOpen(true)}>Create New Group</button>
      </div>
      {groups.length === 0 ? (
        <p>No groups found</p>
      ) : (
        <table className="group-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
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