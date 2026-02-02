#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const BUILD_HISTORY_FILE = path.join(process.env.HOME, 'clawd', 'memory', 'build-history.json');

class BuildTracker {
  constructor() {
    this.historyFile = BUILD_HISTORY_FILE;
  }

  async ensureDataFile() {
    try {
      await fs.access(this.historyFile);
    } catch {
      await fs.mkdir(path.dirname(this.historyFile), { recursive: true });
      await fs.writeFile(this.historyFile, JSON.stringify({ builds: [] }, null, 2));
    }
  }

  async loadHistory() {
    await this.ensureDataFile();
    const data = await fs.readFile(this.historyFile, 'utf8');
    return JSON.parse(data);
  }

  async saveHistory(history) {
    await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
  }

  getResourceUsage() {
    try {
      // Get CPU and memory usage
      const uptime = execSync('uptime').toString().trim();
      const meminfo = execSync('free -m').toString();
      
      // Parse uptime for load average
      const loadMatch = uptime.match(/load average: ([\d.]+)/);
      const load = loadMatch ? parseFloat(loadMatch[1]) : null;
      
      // Parse memory usage
      const memMatch = meminfo.match(/Mem:\s+(\d+)\s+(\d+)\s+(\d+)/);
      const totalMem = memMatch ? parseInt(memMatch[1]) : null;
      const usedMem = memMatch ? parseInt(memMatch[2]) : null;
      const memUsage = totalMem ? Math.round((usedMem / totalMem) * 100) : null;
      
      return {
        load_average: load,
        memory_usage_percent: memUsage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Could not get resource usage:', error.message);
      return {
        load_average: null,
        memory_usage_percent: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  getGitInfo(directory = process.cwd()) {
    try {
      const originalCwd = process.cwd();
      process.chdir(directory);
      
      const commitHash = execSync('git rev-parse HEAD').toString().trim();
      const repoUrl = execSync('git config --get remote.origin.url').toString().trim();
      
      process.chdir(originalCwd);
      
      return {
        commit_hash: commitHash,
        repo_url: repoUrl
      };
    } catch (error) {
      return {
        commit_hash: null,
        repo_url: null
      };
    }
  }

  async logBuild(options) {
    const history = await this.loadHistory();
    const startTime = Date.now();
    
    // Get resource usage at start
    const resourceStart = this.getResourceUsage();
    
    const build = {
      id: `build-${Date.now()}`,
      timestamp: new Date().toISOString(),
      project: options.project,
      description: options.description || '',
      status: options.status,
      duration_minutes: options.duration || null,
      resource_usage: {
        start: resourceStart,
        end: options.endResources || null
      },
      ...this.getGitInfo(options.directory),
      repo_url: options.repoUrl || null,
      notes: options.notes || ''
    };

    // Override repo_url if provided
    if (options.repoUrl) {
      build.repo_url = options.repoUrl;
    }

    history.builds.unshift(build); // Add to beginning (most recent first)
    
    // Keep only last 100 builds to prevent file bloat
    if (history.builds.length > 100) {
      history.builds = history.builds.slice(0, 100);
    }
    
    await this.saveHistory(history);
    return build;
  }

  async listBuilds(limit = 20) {
    const history = await this.loadHistory();
    return history.builds.slice(0, limit);
  }

  async getStats() {
    const history = await this.loadHistory();
    const builds = history.builds;
    
    if (builds.length === 0) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        success_rate: 0,
        average_duration: null,
        most_recent: null
      };
    }

    const successful = builds.filter(b => b.status === 'success').length;
    const failed = builds.filter(b => b.status === 'failed').length;
    const buildsWithDuration = builds.filter(b => b.duration_minutes !== null);
    const averageDuration = buildsWithDuration.length > 0 
      ? Math.round(buildsWithDuration.reduce((sum, b) => sum + b.duration_minutes, 0) / buildsWithDuration.length * 10) / 10
      : null;

    return {
      total: builds.length,
      success: successful,
      failed: failed,
      success_rate: Math.round((successful / builds.length) * 100),
      average_duration: averageDuration,
      most_recent: builds[0]?.timestamp || null
    };
  }

  async generateReport() {
    const stats = await this.getStats();
    const builds = await this.listBuilds(10);
    
    return {
      stats,
      recent_builds: builds
    };
  }
}

module.exports = BuildTracker;