'use client';

import React from 'react';
import { Star, Trophy, Gift, Crown, TrendingUp } from 'lucide-react';

import { LoyaltyStatus } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface LoyaltyStatusProps {
  loyalty: LoyaltyStatus;
  onRedeemPoints?: (points: number) => void;
  className?: string;
}

export function LoyaltyStatusComponent({
  loyalty,
  onRedeemPoints,
  className = ''
}: LoyaltyStatusProps) {
  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return <Trophy className="w-6 h-6 text-amber-600" />;
      case 'silver':
        return <Star className="w-6 h-6 text-gray-400" />;
      case 'gold':
        return <Crown className="w-6 h-6 text-yellow-500" />;
      default:
        return <Trophy className="w-6 h-6 text-gray-400" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'silver':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRedemptionOptions = () => {
    const options = [];
    let points = loyalty.points;

    // 100 points = $5 discount
    while (points >= 100) {
      const discount = Math.floor(points / 100) * 5;
      options.push({
        points: Math.floor(points / 100) * 100,
        discount,
        description: `$${discount} discount`
      });
      points = points % 100;
    }

    return options.slice(0, 3); // Show max 3 options
  };

  const handleRedeem = (pointsToRedeem: number) => {
    if (onRedeemPoints && pointsToRedeem <= loyalty.points) {
      onRedeemPoints(pointsToRedeem);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Tier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getTierIcon(loyalty.tier)}
              <span>Loyalty Status</span>
            </div>
            <Badge className={getTierColor(loyalty.tier)}>
              {loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1)} Member
            </Badge>
          </CardTitle>
          <CardDescription>
            Your loyalty tier determines your benefits and rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Points Balance */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {loyalty.points.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Available Points</div>
              <div className="text-xs text-gray-500 mt-1">
                {loyalty.pointsEarned} earned • {loyalty.pointsRedeemed} redeemed
              </div>
            </div>

            {/* Tier Progress */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {loyalty.nextTier ? Math.round(loyalty.nextTier.progress) : 100}%
              </div>
              <div className="text-sm text-gray-600">Tier Progress</div>
              {loyalty.nextTier && (
                <div className="mt-3">
                  <Progress value={loyalty.nextTier.progress} className="h-2" />
                  <div className="text-xs text-gray-500 mt-1">
                    {loyalty.nextTier.pointsRequired - loyalty.points} points to {loyalty.nextTier.name}
                  </div>
                </div>
              )}
            </div>

            {/* Benefits Count */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {loyalty.benefits.length}
              </div>
              <div className="text-sm text-gray-600">Active Benefits</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="w-5 h-5 mr-2" />
            Your Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loyalty.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Points Redemption */}
      {onRedeemPoints && loyalty.points >= 100 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Redeem Points
            </CardTitle>
            <CardDescription>
              Convert your loyalty points into discounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getRedemptionOptions().map((option, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">
                      {option.description}
                    </div>
                    <div className="text-sm text-gray-600">
                      {option.points.toLocaleString()} points
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRedeem(option.points)}
                    variant="outline"
                    size="sm"
                  >
                    Redeem
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Points History */}
      <Card>
        <CardHeader>
          <CardTitle>Points Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Points Earned</div>
                  <div className="text-sm text-gray-600">From purchases and activities</div>
                </div>
              </div>
              <div className="text-lg font-semibold text-green-600">
                +{loyalty.pointsEarned.toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Gift className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Points Redeemed</div>
                  <div className="text-sm text-gray-600">Converted to discounts</div>
                </div>
              </div>
              <div className="text-lg font-semibold text-blue-600">
                -{loyalty.pointsRedeemed.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoyaltyStatusComponent;