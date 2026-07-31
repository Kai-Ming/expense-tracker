// YearLineChart.tsx - Labels hidden
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export interface YearLineChartProps {
  data: number[];
  labels: string[];
  labelFormatter: (value: string) => string;
  color?: string;
  strokeColor?: string;
  segments?: number;
  formatTooltip?: (value: number) => string;
}

const YearLineChart: React.FC<YearLineChartProps> = ({
  data,
  labels,
  labelFormatter,
  color = "rgba(134, 65, 244, 1)",
  strokeColor = "#6200ee",
  segments = 5,
  formatTooltip,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<{
    index: number;
    value: number;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const chartWidth = screenWidth - 40;

  // Calculate nice y-axis intervals
  const { maxValue, step } = useMemo(() => {
    const maxDataValue = Math.max(...data);
    let step = 10;

    // Auto-calculate step based on data range
    if (maxDataValue > 100000000) step = 10000000;
    else if (maxDataValue > 50000000) step = 5000000;
    else if (maxDataValue > 10000000) step = 1000000;
    else if (maxDataValue > 5000000) step = 500000;
    else if (maxDataValue > 1000000) step = 100000;
    else if (maxDataValue > 500000) step = 50000;
    else if (maxDataValue > 100000) step = 10000;
    else if (maxDataValue > 50000) step = 5000;
    else if (maxDataValue > 10000) step = 1000;
    else if (maxDataValue > 5000) step = 500;
    else if (maxDataValue > 1000) step = 100;
    else if (maxDataValue > 500) step = 50;
    else if (maxDataValue > 100) step = 10;
    else if (maxDataValue > 50) step = 5;
    else if (maxDataValue > 10) step = 1;

    const roundedMax = Math.ceil(maxDataValue / step) * step;
    return { maxValue: roundedMax, step };
  }, [data]);

  // Scale data to fit within the nice max value
  const scaledData = useMemo(() => {
    const currentMax = Math.max(...data);
    if (currentMax === 0) return data;
    const scaleFactor = maxValue / currentMax;
    return data.map((value) => value * scaleFactor);
  }, [data, maxValue]);

  // PanResponder for touch handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX } = evt.nativeEvent;
      const padding = 32;
      const chartAreaWidth = chartWidth - padding * 2;
      const step = chartAreaWidth / (data.length - 1);
      const relativeX = locationX - padding;
      const index = Math.round(relativeX / step);

      if (index >= 0 && index < data.length) {
        setSelectedPoint({
          index: index,
          value: data[index],
        });
        setTooltipPosition({
          x: Math.min(locationX - 40, screenWidth - 120),
          y: Math.max(evt.nativeEvent.locationY - 70, 20),
        });
      }
    },
  });

  return (
    <View style={{ position: "relative" }}>
      <LineChart
        data={{
          labels: labels,
          datasets: [
            {
              data: scaledData,
              color: (opacity = 1) => color.replace("1)", `${opacity})`),
              strokeWidth: 3,
            },
          ],
        }}
        width={chartWidth}
        height={220}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: strokeColor,
          },
          propsForBackgroundLines: {
            strokeDasharray: "5, 5",
          },
        }}
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        formatYLabel={() => ""} // Remove Y-axis labels
        fromZero={true}
        withVerticalLabels={true}
        withHorizontalLabels={false} // Hide horizontal labels
        withVerticalLines={true}
        withHorizontalLines={true}
        segments={segments}
      />

      {/* Touch overlay */}
      <View
        {...panResponder.panHandlers}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          zIndex: 1,
        }}
      />

      {selectedPoint && (
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              zIndex: 2,
            },
          ]}
        >
          <Text style={styles.tooltipLabel}>{labels[selectedPoint.index]}</Text>
          <Text style={[styles.tooltipValue, { color: strokeColor }]}>
            {formatTooltip
              ? formatTooltip(selectedPoint.value)
              : selectedPoint.value.toString()}
          </Text>
          <TouchableOpacity
            style={styles.tooltipClose}
            onPress={() => setSelectedPoint(null)}
          >
            <Text style={styles.tooltipCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: "absolute",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 80,
    alignItems: "center",
  },
  tooltipLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  tooltipClose: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#eee",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipCloseText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "bold",
  },
});

export default YearLineChart;
