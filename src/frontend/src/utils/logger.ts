export interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  action: string;
  data?: any;
  error?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Mantener solo los últimos 1000 logs

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Mantener solo los logs más recientes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // También imprimir en consola para desarrollo
    const logMessage = `[${entry.timestamp}] ${entry.level} | ${entry.component} | ${entry.action}`;
    const logData = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
    const logError = entry.error ? ` | Error: ${JSON.stringify(entry.error)}` : '';

    console.log(`${logMessage}${logData}${logError}`);
  }

  debug(component: string, action: string, data?: any): void {
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: 'DEBUG',
      component,
      action,
      data
    });
  }

  info(component: string, action: string, data?: any): void {
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: 'INFO',
      component,
      action,
      data
    });
  }

  warn(component: string, action: string, data?: any): void {
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: 'WARN',
      component,
      action,
      data
    });
  }

  error(component: string, action: string, error: any, data?: any): void {
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: 'ERROR',
      component,
      action,
      data,
      error: {
        message: error?.message || error,
        stack: error?.stack,
        code: error?.code
      }
    });
  }

  // Obtener todos los logs
  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Obtener logs filtrados por componente
  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  // Obtener logs filtrados por nivel
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Obtener logs recientes (últimos N)
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Exportar logs como string para compartir
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Exportar logs como texto legible
  exportLogsAsText(): string {
    return this.logs.map(log => {
      let line = `[${log.timestamp}] ${log.level} | ${log.component} | ${log.action}`;
      if (log.data) {
        line += ` | Data: ${JSON.stringify(log.data)}`;
      }
      if (log.error) {
        line += ` | Error: ${JSON.stringify(log.error)}`;
      }
      return line;
    }).join('\n');
  }

  // Limpiar logs
  clearLogs(): void {
    this.logs = [];
    console.log('Logger: Logs cleared');
  }

  // Obtener estadísticas de logs
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0
      },
      byComponent: {} as Record<string, number>
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
    });

    return stats;
  }
}

// Singleton instance
export const logger = new Logger();

// Helper para componentes React
export const useLogger = (componentName: string) => {
  return {
    debug: (action: string, data?: any) => logger.debug(componentName, action, data),
    info: (action: string, data?: any) => logger.info(componentName, action, data),
    warn: (action: string, data?: any) => logger.warn(componentName, action, data),
    error: (action: string, error: any, data?: any) => logger.error(componentName, action, error, data),
  };
};