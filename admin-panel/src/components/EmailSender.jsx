import { useState } from "react";
import axios from "axios";

const EmailSender = () => {
    const [loading, setLoading] = useState(false);
    const [sentEmails, setSentEmails] = useState([]);

    const sendEmails = async () => {
        setLoading(true);
        try {
            const response = await axios.post("http://localhost:4000/api/email/send", {
                recipients: [
                    { email: "sasinarayanan2003@gmail.com", name: "Sasikumar" },
                    { email: "workwithsk2@gmail.com", name: "Sasikumar N" }
                ]
            });

            if (response.data.success) {
                fetchSentEmails(); // Fetch updated sent emails list
            }
        } catch (error) {
            console.error("❌ Error sending emails:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSentEmails = async () => {
        try {
            const response = await axios.get("http://localhost:4000/api/email/sent");
            setSentEmails(response.data.sentEmails);
        } catch (error) {
            console.error("❌ Error fetching sent emails:", error);
        }
    };

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h2>Email Sender</h2>
            <button 
                onClick={sendEmails} 
                disabled={loading} 
                style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
            >
                {loading ? "Sending..." : "Send Emails"}
            </button>

            <h3>Sent Emails</h3>
            <ul>
                {sentEmails.map((email, index) => (
                    <li key={index}>
                        {email.name} ({email.email}) - {email.status}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default EmailSender;
