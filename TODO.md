# Pro Subscription Fix - Implementation Steps

## Current Status: ✅ Plan Approved - 0/12 steps complete

### Backend Changes (6 steps)
- [ ] 1. **app/routers/auth.py**: Update `/auth/me` to return `subscription_plan`, `subscription_status`
- [ ] 2. **app/crud/user.py**: Add `update_subscription_status(user_id, plan, status)` function  
- [ ] 3. **app/routers/payment.py**: Create/add Stripe webhook endpoint `/webhook/stripe` to call crud update
- [ ] 4. **app/schemas/user.py**: Ensure `UserOut`/`UserRead` includes subscription fields
- [ ] 5. **app/main.py**: Add Stripe webhook route if missing
- [ ] 6. **Test**: Backend - `curl /api/auth/me` shows Pro fields after manual DB update

### Frontend Changes (6 steps)
- [ ] 7. **src/app/payment/success/page.tsx**: Add `fetchCurrentUser()` + redirect to dashboard
- [ ] 8. **src/components/dashboard/Sidebar.tsx**: Add manual refresh button for testing
- [ ] 9. **src/store/auth-store.ts**: Log subscription data in `fetchCurrentUser`
- [ ] 10. **src/lib/api.ts**: Log `/auth/me` response in `getMe`
- [ ] 11. **Test**: Frontend - Payment success → upgrade button disappears
- [ ] 12. **Final Test**: End-to-end - Pro payment → unlimited job recommendations (no 403)

**Next Command**: `npm run dev` (frontend) + backend restart after changes
