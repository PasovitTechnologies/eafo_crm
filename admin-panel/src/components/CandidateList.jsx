import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getCandidates, getAllCandidates, getGroups } from '../api';
import AddCandidateModal from './AddCandidateModal';

function CandidateList() {
  const { groupid } = useParams();
  const location = useLocation();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        console.log('Processing candidates for groupid=', groupid, 'at:', new Date().toISOString());
        console.log('Location state:', location.state);
        const candidateMap = location.state?.candidateMap || {};
        console.log('Candidate map:', candidateMap);
        const groupCandidates = candidateMap[groupid] || [];
        console.log('Candidates for group', groupid, ':', groupCandidates);
        setCandidates(groupCandidates);
        setLoading(false);
      } catch (err) {
        console.error('Error processing candidates:', err);
        setError('Failed to fetch candidates');
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [groupid, location.state]);

  const handleAddCandidateClose = async () => {
    setIsAddModalOpen(false);
    try {
      console.log('Refreshing candidates after adding to group', groupid, 'at:', new Date().toISOString());
      
      // Fetch all candidates to rebuild candidateMap
      const allCandidates = await getAllCandidates();
      console.log('Fetched all candidates after adding:', allCandidates);

      // Rebuild group-to-candidate mapping
      const groupData = await getGroups();
      const groupNameToId = {};
      groupData.forEach(group => {
        groupNameToId[group.group] = String(group.groupid);
      });
      console.log('Group name to ID mapping:', groupNameToId);

      const map = {};
      allCandidates.forEach(candidate => {
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

      console.log('Updated group-to-candidate map:', map);

      // Update local candidates for the current group
      const groupCandidates = map[groupid] || [];
      console.log('Updated candidates for group', groupid, ':', groupCandidates);
      setCandidates(groupCandidates);
      setLoading(false);
    } catch (err) {
      console.error('Error refreshing candidates:', err);
      setError('Failed to fetch candidates');
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="candidate-list">
      <div className="candidate-list-header">
        <Link to="/">
          <button className='exam-button'>Back to Groups</button>
        </Link>
        <button className='exam-button' onClick={() => setIsAddModalOpen(true)}>Add Candidate</button>
      </div>
      <div className="candidate-count">
        Total Candidates: {candidates.length}
      </div>
      {candidates.length === 0 ? (
        <p>No candidates found</p>
      ) : (
        <table className="candidate-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(candidate => (
              <tr key={candidate.candidateid}>
                <td>{candidate.candidateid}</td>
                <td>{candidate.firstname} {candidate.lastname}</td>
                <td>{candidate.email}</td>
                <td>
                  <button className='exam-button' onClick={() => setSelectedCandidate(candidate)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selectedCandidate && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={() => setSelectedCandidate(null)} aria-label="Close modal">
              ✕
            </button>
            <div className="candidate-details">
              <h2>Candidate Details</h2>
              <div className="detail-row">
                <span className="detail-label">ID</span>
                <span className="detail-value">{selectedCandidate.candidateid}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">First Name</span>
                <span className="detail-value">{selectedCandidate.firstname}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Name</span>
                <span className="detail-value">{selectedCandidate.lastname}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email</span>
                <span className="detail-value">{selectedCandidate.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Username</span>
                <span className="detail-value">{selectedCandidate.username}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Group</span>
                <span className="detail-value">{selectedCandidate.group}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created By</span>
                <span className="detail-value">{selectedCandidate.createby}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created Date</span>
                <span className="detail-value">{selectedCandidate.createdate}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {isAddModalOpen && (
        <AddCandidateModal
          onClose={handleAddCandidateClose}
          groupid={groupid}
        />
      )}
    </div>
  );
}

export default CandidateList;