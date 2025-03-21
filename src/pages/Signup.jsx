const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const response = await fetch('/.netlify/edge-functions/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    navigate('/chat');
  } catch (error) {
    console.error('Signup error:', error);
    setError('注册失败，请稍后重试');
  } finally {
    setLoading(false);
  }
};

export default Signup; 