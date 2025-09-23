import axios from 'axios';

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

export class HealthChecker {
  private readonly services = {
    googleBooks: 'https://www.googleapis.com/books/v1/volumes?q=test&maxResults=1',
    openLibrary: 'https://openlibrary.org/search.json?q=test&limit=1',
    gutenberg: 'https://gutendex.com/books?search=test&limit=1'
  };

  async checkService(serviceName: string, url: string): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const responseTime = Date.now() - startTime;
      
      return {
        service: serviceName,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        service: serviceName,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async checkAllServices(): Promise<HealthStatus[]> {
    const promises = Object.entries(this.services).map(([name, url]) =>
      this.checkService(name, url)
    );
    
    return await Promise.all(promises);
  }

  async getHealthSummary(): Promise<{
    overall: 'healthy' | 'unhealthy' | 'degraded';
    services: HealthStatus[];
    healthyCount: number;
    totalCount: number;
  }> {
    const services = await this.checkAllServices();
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const totalCount = services.length;
    
    let overall: 'healthy' | 'unhealthy' | 'degraded';
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount === 0) {
      overall = 'unhealthy';
    } else {
      overall = 'degraded';
    }
    
    return {
      overall,
      services,
      healthyCount,
      totalCount
    };
  }
}

export const healthChecker = new HealthChecker();