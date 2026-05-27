/**
 * VPS Security Scanner Skill - Lifecycle Hooks
 * 
 * Auto-registers weekly security scan job on boot
 */

import type { SkillHooks, SkillHookContext } from '../../../src/types/skill-hooks';

export const hooks: SkillHooks = {
  /**
   * Executed when agent boots
   * Auto-registers weekly security scan if not exists
   */
  async onBoot(context: SkillHookContext) {
    context.logger('Checking for auto-registered security scan job...');

    const jobs = context.cronStorage.loadJobs();
    const hasSecurityJob = jobs.some(
      (job) =>
        job.name === 'Weekly Security Scan' &&
        job.createdBy === context.skillName
    );

    if (!hasSecurityJob) {
      context.logger('Auto-registering weekly security scan job');

      // Get admin user ID from env
      const adminUserId = process.env.TELEGRAM_ALLOWED_USER_IDS?.split(',')[0];
      
      if (!adminUserId) {
        context.logger('⚠️  TELEGRAM_ALLOWED_USER_IDS not set, skipping auto-registration');
        return;
      }

      await context.cronStorage.createJob({
        name: 'Weekly Security Scan',
        prompt: 'Execute full security audit using vps-security-scanner skill. Scan all containers, packages, open ports, and generate detailed report.',
        schedule: { type: 'cron', value: '0 22 * * 0' }, // Sunday 22:00
        trigger: {
          type: 'time',
          schedule: { type: 'cron', value: '0 22 * * 0' }
        },
        deliver: 'telegram',
        deliverTo: adminUserId,
        status: 'active',
        userId: adminUserId,
        createdBy: context.skillName,
        tags: ['security', 'auto-registered', 'vps'],
        permanent: false, // Can be deleted by skill deactivation
        maxRetries: 2,
        retryBackoffMs: 300000, // 5 minutes
        timeoutSeconds: 600, // 10 minutes
      });

      context.logger('✅ Weekly security scan job registered successfully');
    } else {
      context.logger('Security scan job already exists, skipping');
    }
  },

  /**
   * Executed when skill is activated
   */
  async onActivate(context: SkillHookContext) {
    context.logger('VPS Security Scanner skill activated');
    
    // Could register additional jobs or setup resources
  },

  /**
   * Executed when skill is deactivated
   * Auto-cleanup is handled by SkillHookManager
   */
  async onDeactivate(context: SkillHookContext) {
    context.logger('VPS Security Scanner skill deactivated');
    context.logger('Auto-created jobs will be removed automatically');
  },

  /**
   * Executed before agent shutdown
   */
  async onShutdown(context: SkillHookContext) {
    context.logger('Shutting down VPS Security Scanner skill');
    // Cleanup any resources if needed
  },
};
