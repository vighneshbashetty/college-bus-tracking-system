type StudentLoginProps = {
  onLogin: () => void;
  onBack: () => void;
};

export default function StudentLogin({
  onLogin,
  onBack,
}: StudentLoginProps) {
  return (
    <div>
      <h1>Student Login</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin();
        }}
      >
        <div>
          <label>Email</label>
          <br />
          <input
            type="email"
            placeholder="Enter your college email"
            required
          />
        </div>

        <br />

        <div>
          <label>Password</label>
          <br />
          <input
            type="password"
            placeholder="Enter your password"
            required
          />
        </div>

        <br />

        <button type="submit">Login</button>
      </form>

      <br />

      <button onClick={onBack}>Back</button>
    </div>
  );
}