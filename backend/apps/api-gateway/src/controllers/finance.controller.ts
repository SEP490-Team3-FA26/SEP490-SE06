import { Controller, Get, Post, Query, Body, Inject, OnModuleInit, UseGuards, Req } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@ApiTags('💰 Finance & Cash Flow')
@Controller('api/finance')
export class FinanceController implements OnModuleInit {
  constructor(
    @Inject('ORDER_SERVICE') private readonly ordersClient: ClientKafka,
  ) { }

  async onModuleInit() {
    await subscribeToKafkaTopics(this.ordersClient, [
      'finance.expense.create',
      'finance.expense.list',
      'finance.cashflow.summary',
      'finance.payment_voucher.create',
      'finance.payment_voucher.list',
    ]);
  }

  @Post('expenses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'head_branch')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create operational fixed expense record' })
  @AuditLogAction({
    actionCode: 'FINANCE_EXPENSE_CREATE',
    actionName: 'Create fixed expense',
    module: 'Finance',
    eventType: 'CREATE',
    entityType: 'Expense',
  })
  async createExpense(@Body() body: any) {
    return await sendKafkaMessage(this.ordersClient, 'finance.expense.create', body);
  }

  @Get('expenses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of fixed expenses' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: String })
  async getExpenses(
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
    @Query('year') year?: string,
  ) {
    return await sendKafkaMessage(this.ordersClient, 'finance.expense.list', { branchId, category, year });
  }

  @Get('cashflow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consolidated cash flow and drawer analysis by shift, day, or month' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: String })
  @ApiQuery({ name: 'viewType', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String })
  async getCashFlowSummary(
    @Query('branchId') branchId?: string,
    @Query('year') year?: string,
    @Query('viewType') viewType?: string,
    @Query('date') date?: string,
  ) {
    return await sendKafkaMessage(this.ordersClient, 'finance.cashflow.summary', { branchId, year, viewType, date });
  }

  @Post('payment-vouchers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'head_branch', 'branch', 'accountant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create supplier and partner payment voucher' })
  @AuditLogAction({
    actionCode: 'FINANCE_PAYMENT_VOUCHER_CREATE',
    actionName: 'Create payment voucher',
    module: 'Finance',
    eventType: 'CREATE',
    entityType: 'PaymentVoucher',
  })
  async createPaymentVoucher(@Body() body: any, @Req() req: any) {
    const user = req.user || {};
    const payload = {
      ...body,
      createdBy: user.userId || user.id || body.createdBy,
      createdByName: user.fullName || user.username || body.createdByName || 'Staff',
    };
    return await sendKafkaMessage(this.ordersClient, 'finance.payment_voucher.create', payload);
  }

  @Get('payment-vouchers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of supplier and partner payment vouchers' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'recipientType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getPaymentVouchers(
    @Query('branchId') branchId?: string,
    @Query('recipientType') recipientType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await sendKafkaMessage(this.ordersClient, 'finance.payment_voucher.list', {
      branchId,
      recipientType,
      status,
      startDate,
      endDate,
    });
  }
}
