export const initiateDiscordAuth = () => {
    const width = 500;
    const height = 800;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
  
    window.open(
      'http://localhost:5001/api/discord/auth',
      'Discord Auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };
  
  export const exchangeCodeForToken = async (code) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userData = JSON.parse(decodeURIComponent(urlParams.get('data')));
      return userData;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  };