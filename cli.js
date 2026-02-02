#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const Table = require('cli-table3');
const BuildTracker = require('./index');

const tracker = new BuildTracker();

function formatDuration(minutes) {
  if (minutes === null) return 'N/A';
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes * 10) / 10}m`;
  return `${Math.round(minutes / 60 * 10) / 10}h`;
}

function formatStatus(status) {
  switch (status) {
    case 'success':
      return chalk.green('✓ Success');
    case 'failed':
      return chalk.red('✗ Failed');
    case 'running':
      return chalk.yellow('⚡ Running');
    default:
      return chalk.gray(`? ${status}`);
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  if (diffHours < 24) {
    return `${Math.round(diffHours)}h ago`;
  } else if (diffDays < 7) {
    return `${Math.round(diffDays)}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

program
  .name('build-tracker')
  .description('Track nightly builds and their metadata')
  .version('1.0.0');

program
  .command('log')
  .description('Log a build')
  .requiredOption('-p, --project <name>', 'Project name')
  .option('-d, --description <desc>', 'Build description')
  .requiredOption('-s, --status <status>', 'Build status (success/failed/running)')
  .option('-r, --repo-url <url>', 'GitHub repository URL')
  .option('-t, --duration <minutes>', 'Build duration in minutes', parseFloat)
  .option('-n, --notes <notes>', 'Additional notes')
  .option('--directory <path>', 'Project directory (for git info)', process.cwd())
  .action(async (options) => {
    try {
      const build = await tracker.logBuild(options);
      console.log(chalk.green('✓ Build logged successfully'));
      console.log(`  ID: ${build.id}`);
      console.log(`  Project: ${build.project}`);
      console.log(`  Status: ${formatStatus(build.status)}`);
      if (build.duration_minutes) {
        console.log(`  Duration: ${formatDuration(build.duration_minutes)}`);
      }
      if (build.repo_url) {
        console.log(`  Repo: ${build.repo_url}`);
      }
    } catch (error) {
      console.error(chalk.red('Error logging build:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List recent builds')
  .option('-l, --limit <number>', 'Number of builds to show', '20')
  .action(async (options) => {
    try {
      const builds = await tracker.listBuilds(parseInt(options.limit));
      
      if (builds.length === 0) {
        console.log(chalk.yellow('No builds found'));
        return;
      }

      const table = new Table({
        head: ['Project', 'Status', 'Duration', 'When', 'Repo'],
        colWidths: [20, 12, 10, 12, 40]
      });

      builds.forEach(build => {
        table.push([
          build.project,
          formatStatus(build.status),
          formatDuration(build.duration_minutes),
          formatTimestamp(build.timestamp),
          build.repo_url ? build.repo_url.replace(/^https:\/\/github\.com\//, '') : 'N/A'
        ]);
      });

      console.log('\n🔨 Recent Builds\n');
      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red('Error listing builds:'), error.message);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show build statistics')
  .action(async () => {
    try {
      const stats = await tracker.getStats();
      
      console.log('\n📊 Build Statistics\n');
      
      const table = new Table({
        head: ['Metric', 'Value'],
        colWidths: [25, 20]
      });

      table.push(
        ['Total Builds', stats.total],
        ['Successful', chalk.green(stats.success)],
        ['Failed', chalk.red(stats.failed)],
        ['Success Rate', `${stats.success_rate}%`],
        ['Average Duration', stats.average_duration ? formatDuration(stats.average_duration) : 'N/A'],
        ['Most Recent', stats.most_recent ? formatTimestamp(stats.most_recent) : 'N/A']
      );

      console.log(table.toString());
      
      // Show success rate bar
      if (stats.total > 0) {
        console.log('\n📈 Success Rate Visualization');
        const barLength = 40;
        const successChars = Math.round((stats.success_rate / 100) * barLength);
        const bar = '█'.repeat(successChars) + '░'.repeat(barLength - successChars);
        console.log(`${chalk.green(bar)} ${stats.success_rate}%`);
      }
    } catch (error) {
      console.error(chalk.red('Error getting stats:'), error.message);
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate a comprehensive report')
  .action(async () => {
    try {
      const report = await tracker.generateReport();
      
      console.log('\n📋 Build Tracker Report\n');
      
      // Stats section
      console.log(chalk.bold('📊 Statistics'));
      console.log(`Total builds: ${report.stats.total}`);
      console.log(`Success rate: ${chalk.green(report.stats.success_rate + '%')}`);
      console.log(`Average duration: ${report.stats.average_duration ? formatDuration(report.stats.average_duration) : 'N/A'}`);
      
      // Recent builds
      if (report.recent_builds.length > 0) {
        console.log('\n' + chalk.bold('🔨 Recent Builds'));
        report.recent_builds.slice(0, 5).forEach(build => {
          console.log(`  ${formatStatus(build.status)} ${build.project} (${formatTimestamp(build.timestamp)})`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('Error generating report:'), error.message);
      process.exit(1);
    }
  });

program.parse();