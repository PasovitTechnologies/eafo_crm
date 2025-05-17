import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCandidates } from '../api';
import AddCandidateModal from './AddCandidateModal';

function CandidateList() {
  const { groupid } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchCandidates = async () => {
    try {
      console.log('Fetching candidates for group', groupid, 'at:', new Date().toISOString());
      const data = await getCandidates(groupid);
      console.log('Fetched candidates:', data);
      setCandidates(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch candidates');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [groupid]);

  const handleAddCandidateClose = () => {
    setIsAddModalOpen(false);
    fetchCandidates(); // Refresh the candidate list after adding a new candidate
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="candidate-list">
      <div className="candidate-list-header">
        <Link to="/exams">
          <button>Back to Groups</button>
        </Link>
        <button onClick={() => setIsAddModalOpen(true)}>Add Candidate</button>
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
                  <button onClick={() => setSelectedCandidate(candidate)}>View</button>
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