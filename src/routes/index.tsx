import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { AppShell } from '../layouts/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { LoadingState } from '../components/ui/EmptyState';
import { PlaceholderModule } from '../components/PlaceholderModule';

// Dynamic lazy-loaded route components for performance & code splitting
const Login = lazy(() => import('../pages/auth/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('../pages/auth/Register').then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const OtpVerification = lazy(() => import('../pages/auth/OtpVerification').then((m) => ({ default: m.OtpVerification })));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const Dashboard = lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const ProductList = lazy(() => import('../pages/products/ProductList').then((m) => ({ default: m.ProductList })));
const ProductCreate = lazy(() => import('../pages/products/ProductCreate').then((m) => ({ default: m.ProductCreate })));
const ProductDetail = lazy(() => import('../pages/products/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const WarehouseList = lazy(() => import('../pages/warehouses/WarehouseList').then((m) => ({ default: m.WarehouseList })));
const WarehouseCreate = lazy(() => import('../pages/warehouses/WarehouseCreate').then((m) => ({ default: m.WarehouseCreate })));
const WarehouseDetail = lazy(() => import('../pages/warehouses/WarehouseDetail').then((m) => ({ default: m.WarehouseDetail })));
const LocationList = lazy(() => import('../pages/locations/LocationList').then((m) => ({ default: m.LocationList })));
const LocationCreate = lazy(() => import('../pages/locations/LocationCreate').then((m) => ({ default: m.LocationCreate })));
const LocationDetail = lazy(() => import('../pages/locations/LocationDetail').then((m) => ({ default: m.LocationDetail })));
const StockList = lazy(() => import('../pages/stock/StockList').then((m) => ({ default: m.StockList })));
const ReceiptList = lazy(() => import('../pages/operations/receipts/ReceiptList').then((m) => ({ default: m.ReceiptList })));
const ReceiptCreate = lazy(() => import('../pages/operations/receipts/ReceiptCreate').then((m) => ({ default: m.ReceiptCreate })));
const ReceiptDetail = lazy(() => import('../pages/operations/receipts/ReceiptDetail').then((m) => ({ default: m.ReceiptDetail })));
const DeliveryList = lazy(() => import('../pages/operations/deliveries/DeliveryList').then((m) => ({ default: m.DeliveryList })));
const DeliveryCreate = lazy(() => import('../pages/operations/deliveries/DeliveryCreate').then((m) => ({ default: m.DeliveryCreate })));
const DeliveryDetail = lazy(() => import('../pages/operations/deliveries/DeliveryDetail').then((m) => ({ default: m.DeliveryDetail })));
const TransferList = lazy(() => import('../pages/operations/transfers/TransferList').then((m) => ({ default: m.TransferList })));
const TransferCreate = lazy(() => import('../pages/operations/transfers/TransferCreate').then((m) => ({ default: m.TransferCreate })));
const TransferDetail = lazy(() => import('../pages/operations/transfers/TransferDetail').then((m) => ({ default: m.TransferDetail })));
const AdjustmentList = lazy(() => import('../pages/operations/adjustments/AdjustmentList').then((m) => ({ default: m.AdjustmentList })));
const AdjustmentCreate = lazy(() => import('../pages/operations/adjustments/AdjustmentCreate').then((m) => ({ default: m.AdjustmentCreate })));
const AdjustmentDetail = lazy(() => import('../pages/operations/adjustments/AdjustmentDetail').then((m) => ({ default: m.AdjustmentDetail })));
const MoveHistoryList = lazy(() => import('../pages/audit/MoveHistoryList').then((m) => ({ default: m.MoveHistoryList })));

const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingState message="Loading module workspace..." />}>
    {children}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      /* Public Auth Routes */
      { path: 'login', element: <SuspenseWrapper><Login /></SuspenseWrapper> },
      { path: 'register', element: <SuspenseWrapper><Register /></SuspenseWrapper> },
      { path: 'forgot-password', element: <SuspenseWrapper><ForgotPassword /></SuspenseWrapper> },
      { path: 'verify-otp', element: <SuspenseWrapper><OtpVerification /></SuspenseWrapper> },
      { path: 'reset-password', element: <SuspenseWrapper><ResetPassword /></SuspenseWrapper> },

      /* Protected Application Shell Routes */
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              {
                path: 'dashboard',
                element: <SuspenseWrapper><Dashboard /></SuspenseWrapper>,
              },
              /* Products */
              {
                path: 'products',
                element: <SuspenseWrapper><ProductList /></SuspenseWrapper>,
              },
              {
                path: 'products/new',
                element: <SuspenseWrapper><ProductCreate /></SuspenseWrapper>,
              },
              {
                path: 'products/:id',
                element: <SuspenseWrapper><ProductDetail /></SuspenseWrapper>,
              },
              /* Stock */
              {
                path: 'stock',
                element: <SuspenseWrapper><StockList /></SuspenseWrapper>,
              },
              /* Receipts */
              {
                path: 'operations/receipts',
                element: <SuspenseWrapper><ReceiptList /></SuspenseWrapper>,
              },
              {
                path: 'operations/receipts/new',
                element: <SuspenseWrapper><ReceiptCreate /></SuspenseWrapper>,
              },
              {
                path: 'operations/receipts/:id',
                element: <SuspenseWrapper><ReceiptDetail /></SuspenseWrapper>,
              },
              /* Deliveries */
              {
                path: 'operations/deliveries',
                element: <SuspenseWrapper><DeliveryList /></SuspenseWrapper>,
              },
              {
                path: 'operations/deliveries/new',
                element: <SuspenseWrapper><DeliveryCreate /></SuspenseWrapper>,
              },
              {
                path: 'operations/deliveries/:id',
                element: <SuspenseWrapper><DeliveryDetail /></SuspenseWrapper>,
              },
              /* Transfers */
              {
                path: 'operations/transfers',
                element: <SuspenseWrapper><TransferList /></SuspenseWrapper>,
              },
              {
                path: 'operations/transfers/new',
                element: <SuspenseWrapper><TransferCreate /></SuspenseWrapper>,
              },
              {
                path: 'operations/transfers/:id',
                element: <SuspenseWrapper><TransferDetail /></SuspenseWrapper>,
              },
              /* Adjustments */
              {
                path: 'operations/adjustments',
                element: <SuspenseWrapper><AdjustmentList /></SuspenseWrapper>,
              },
              {
                path: 'operations/adjustments/new',
                element: <SuspenseWrapper><AdjustmentCreate /></SuspenseWrapper>,
              },
              {
                path: 'operations/adjustments/:id',
                element: <SuspenseWrapper><AdjustmentDetail /></SuspenseWrapper>,
              },
              /* Move History */
              {
                path: 'move-history',
                element: <SuspenseWrapper><MoveHistoryList /></SuspenseWrapper>,
              },
              /* Settings - Warehouses */
              {
                path: 'settings/warehouses',
                element: <SuspenseWrapper><WarehouseList /></SuspenseWrapper>,
              },
              {
                path: 'settings/warehouses/new',
                element: <SuspenseWrapper><WarehouseCreate /></SuspenseWrapper>,
              },
              {
                path: 'settings/warehouses/:id',
                element: <SuspenseWrapper><WarehouseDetail /></SuspenseWrapper>,
              },
              /* Settings - Locations */
              {
                path: 'settings/locations',
                element: <SuspenseWrapper><LocationList /></SuspenseWrapper>,
              },
              {
                path: 'settings/locations/new',
                element: <SuspenseWrapper><LocationCreate /></SuspenseWrapper>,
              },
              {
                path: 'settings/locations/:id',
                element: <SuspenseWrapper><LocationDetail /></SuspenseWrapper>,
              },
              /* Profile */
              {
                path: 'profile',
                element: <SuspenseWrapper><ProfilePage /></SuspenseWrapper>,
              },
            ],
          },
        ],
      },
    ],
  },
]);

export const AppRoutes = () => {
  return <RouterProvider router={router} />;
};
