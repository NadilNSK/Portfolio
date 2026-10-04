import { useState } from 'react';

export default function Contact() {
  const [showPopup, setShowPopup] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowPopup(true);
    
    setTimeout(() => {
      setShowPopup(false);
    }, 3000);
  };

  return (
    <section className="contact" id="contact">
      <h2 className="heading">Contact <span>Me</span></h2>

      <form onSubmit={handleSubmit}>
        <div className="input-box">
          <input type="text" name="name" placeholder="Full Name" required />
          <input type="email" name="email" placeholder="Email Address" required />
        </div>
        <div className="input-box">
          <input type="tel" name="phone" placeholder="Mobile Number" />
          <input type="text" name="subject" placeholder="Email Subject" />
        </div>
        <textarea name="message" cols="30" rows="8" placeholder="Your Message" required></textarea>
        <button type="submit" className="btn">Send Message</button>
      </form>

      <div id="popup" className={`popup ${showPopup ? 'show' : ''}`}>
        <p id="popup-message">Message Sent Successfully!</p>
      </div>
    </section>
  );
}
