/**
 * GitHub Integration Service
 * Secure helper to communicate with GitHub REST API
 */

const githubFetch = async (url, token) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CodeLens-App'
      }
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${errBody}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`GitHub fetch error for URL: ${url}`, error.message);
    throw error;
  }
};

/**
 * Fetch list of repositories for the authenticated user
 */
const getUserRepos = async (token) => {
  return await githubFetch('https://api.github.com/user/repos?sort=updated&per_page=100', token);
};

/**
 * Fetch list of pull requests for a specific repository
 */
const getRepoPulls = async (token, owner, repo, state = 'all') => {
  return await githubFetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=50`, token);
};

/**
 * Fetch details of a single pull request
 */
const getPullDetails = async (token, owner, repo, pullNumber) => {
  return await githubFetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, token);
};

/**
 * Fetch details of files modified in a pull request, including their content & patches
 */
const getPullFiles = async (token, owner, repo, pullNumber) => {
  const filesList = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100`, token);
  
  const extMap = {
    'js': 'javascript', 'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'py': 'python', 'java': 'java',
    'cpp': 'cpp', 'c': 'c', 'h': 'c',
    'cs': 'csharp', 'go': 'go',
    'rb': 'ruby', 'php': 'php',
    'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown'
  };

  const filesWithContent = await Promise.all(
    filesList.map(async (file) => {
      let content = '';
      try {
        if (file.raw_url) {
          const rawResponse = await fetch(file.raw_url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'User-Agent': 'CodeLens-App'
            }
          });
          if (rawResponse.ok) {
            content = await rawResponse.text();
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch raw contents for file: ${file.filename}`, err.message);
      }

      const ext = file.filename.split('.').pop() || 'javascript';
      const lang = extMap[ext] || ext;

      return {
        name: file.filename,
        path: file.filename,
        content: content || file.patch || `// Content unavailable. Status: ${file.status}`,
        patch: file.patch || '',
        language: lang,
        additions: file.additions || 0,
        deletions: file.deletions || 0,
        status: file.status || 'modified',
        rawUrl: file.raw_url || ''
      };
    })
  );

  return filesWithContent;
};

/**
 * Fetch GitHub user profile using token
 */
const getUserProfile = async (token) => {
  return await githubFetch('https://api.github.com/user', token);
};

module.exports = {
  getUserRepos,
  getRepoPulls,
  getPullDetails,
  getPullFiles,
  getUserProfile
};
