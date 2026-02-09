import chalk from 'chalk';

/**
 * Log info message
 */
export function info(message: string): void {
  console.log(chalk.blue(message));
}

/**
 * Log success message
 */
export function success(message: string): void {
  console.log(chalk.green(message));
}

/**
 * Log warning message
 */
export function warning(message: string): void {
  console.log(chalk.yellow(message));
}

/**
 * Log error message
 */
export function error(message: string): void {
  console.error(chalk.red(message));
}

/**
 * Log dimmed message
 */
export function dim(message: string): void {
  console.log(chalk.dim(message));
}
