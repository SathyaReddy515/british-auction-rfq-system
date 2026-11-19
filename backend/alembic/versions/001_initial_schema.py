"""Initial schema based on approved British Auction design

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-11-19 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. rfqs table
    op.create_table(
        'rfqs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('reference_id', sa.String(length=60), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('buyer_id', sa.Uuid(), nullable=False),
        sa.Column('bid_start_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('initial_bid_close_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_bid_close_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('forced_close_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('pickup_service_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['buyer_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reference_id'),
        sa.CheckConstraint('initial_bid_close_at > bid_start_at', name='check_bid_start_before_close'),
        sa.CheckConstraint('forced_close_at > initial_bid_close_at', name='check_forced_close_after_initial'),
        sa.CheckConstraint('current_bid_close_at <= forced_close_at', name='check_current_close_le_forced')
    )
    op.create_index(op.f('ix_rfqs_buyer_id'), 'rfqs', ['buyer_id'], unique=False)
    op.create_index(op.f('ix_rfqs_reference_id'), 'rfqs', ['reference_id'], unique=True)
    op.create_index(op.f('ix_rfqs_status'), 'rfqs', ['status'], unique=False)

    # 3. auction_configs table
    op.create_table(
        'auction_configs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('rfq_id', sa.Uuid(), nullable=False),
        sa.Column('trigger_window_minutes', sa.Integer(), nullable=False),
        sa.Column('extension_duration_minutes', sa.Integer(), nullable=False),
        sa.Column('trigger_type', sa.String(length=40), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['rfq_id'], ['rfqs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('rfq_id'),
        sa.CheckConstraint('trigger_window_minutes > 0', name='check_trigger_window_positive'),
        sa.CheckConstraint('extension_duration_minutes > 0', name='check_extension_duration_positive')
    )
    op.create_index(op.f('ix_auction_configs_rfq_id'), 'auction_configs', ['rfq_id'], unique=True)

    # 4. quotes table
    op.create_table(
        'quotes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('rfq_id', sa.Uuid(), nullable=False),
        sa.Column('supplier_id', sa.Uuid(), nullable=False),
        sa.Column('carrier_name', sa.String(length=160), nullable=False),
        sa.Column('freight_charges', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('origin_charges', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('destination_charges', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('transit_time', sa.String(length=100), nullable=False),
        sa.Column('validity_text', sa.String(length=100), nullable=False),
        sa.Column('currency_code', sa.String(length=3), nullable=False, server_default='INR'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['rfq_id'], ['rfqs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['supplier_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('freight_charges >= 0', name='check_freight_charges_non_negative'),
        sa.CheckConstraint('origin_charges >= 0', name='check_origin_charges_non_negative'),
        sa.CheckConstraint('destination_charges >= 0', name='check_destination_charges_non_negative')
    )
    op.create_index(op.f('ix_quotes_rfq_id'), 'quotes', ['rfq_id'], unique=False)
    op.create_index(op.f('ix_quotes_supplier_id'), 'quotes', ['supplier_id'], unique=False)

    # 5. bids table
    op.create_table(
        'bids',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('rfq_id', sa.Uuid(), nullable=False),
        sa.Column('quote_id', sa.Uuid(), nullable=False),
        sa.Column('supplier_id', sa.Uuid(), nullable=False),
        sa.Column('bid_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('currency_code', sa.String(length=3), nullable=False, server_default='INR'),
        sa.Column('request_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['rfq_id'], ['rfqs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['supplier_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('request_id'),
        sa.CheckConstraint('bid_amount > 0', name='check_bid_amount_positive')
    )
    op.create_index('ix_bids_rfq_amount_created', 'bids', ['rfq_id', 'bid_amount', 'created_at'], unique=False)
    op.create_index('ix_bids_rfq_supplier_created', 'bids', ['rfq_id', 'supplier_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_bids_quote_id'), 'bids', ['quote_id'], unique=False)
    op.create_index(op.f('ix_bids_request_id'), 'bids', ['request_id'], unique=True)
    op.create_index(op.f('ix_bids_rfq_id'), 'bids', ['rfq_id'], unique=False)
    op.create_index(op.f('ix_bids_supplier_id'), 'bids', ['supplier_id'], unique=False)

    # 6. auction_activity_logs table
    op.create_table(
        'auction_activity_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('rfq_id', sa.Uuid(), nullable=False),
        sa.Column('actor_user_id', sa.Uuid(), nullable=True),
        sa.Column('event_type', sa.String(length=40), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('event_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['rfq_id'], ['rfqs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_activity_logs_rfq_created', 'auction_activity_logs', ['rfq_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_auction_activity_logs_actor_user_id'), 'auction_activity_logs', ['actor_user_id'], unique=False)
    op.create_index(op.f('ix_auction_activity_logs_event_type'), 'auction_activity_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_auction_activity_logs_rfq_id'), 'auction_activity_logs', ['rfq_id'], unique=False)

    # 7. auction_results table
    op.create_table(
        'auction_results',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('rfq_id', sa.Uuid(), nullable=False),
        sa.Column('winning_supplier_id', sa.Uuid(), nullable=True),
        sa.Column('final_bid_id', sa.Uuid(), nullable=True),
        sa.Column('final_bid_amount', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('selection_status', sa.String(length=30), nullable=False),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['final_bid_id'], ['bids.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['rfq_id'], ['rfqs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['winning_supplier_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('rfq_id')
    )
    op.create_index(op.f('ix_auction_results_rfq_id'), 'auction_results', ['rfq_id'], unique=True)
    op.create_index(op.f('ix_auction_results_winning_supplier_id'), 'auction_results', ['winning_supplier_id'], unique=False)


def downgrade() -> None:
    op.drop_table('auction_results')
    op.drop_table('auction_activity_logs')
    op.drop_table('bids')
    op.drop_table('quotes')
    op.drop_table('auction_configs')
    op.drop_table('rfqs')
    op.drop_table('users')
