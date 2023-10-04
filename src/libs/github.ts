import { exec } from 'child_process';

// Function to get the last commit message
export const getLastCommitMessage = (): Promise<string> => {
	return new Promise<string>((resolve, reject) => {
		exec('git log -1 --pretty=%B', (error: Error | null, stdout: string, stderr: string) => {
			if (error) {
				reject(error);
				return;
			}
			if (stderr) {
				reject(new Error(stderr));
				return;
			}
			resolve(stdout.trim());
		});
	});
};
