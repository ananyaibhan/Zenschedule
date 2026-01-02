import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { taskService, Task } from '../../services/taskService';
import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

const TasksScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await taskService.getTasks();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text.disabled;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'done':
      case 'completed':
      case 'finished':
        return colors.success;
      case 'in progress':
      case 'working':
        return colors.info;
      default:
        return colors.text.secondary;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const groupedTasks = tasks.reduce((acc: any, task) => {
    const status = task.status || 'No Status';
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {});

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['bottom']}>
      <ScrollView
        style={commonStyles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.subtitle}>{tasks.length} total tasks from Notion</Text>
        </View>

        {Object.entries(groupedTasks).map(([status, statusTasks]: [string, any]) => (
          <View key={status} style={styles.section}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>{status}</Text>
              <Text style={styles.statusCount}>{statusTasks.length}</Text>
            </View>

            {statusTasks.map((task: Task, index: number) => (
              <Card key={index} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskName} numberOfLines={2}>
                    {task.name || 'Untitled Task'}
                  </Text>
                  {task.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '20', borderColor: getPriorityColor(task.priority) }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                        {task.priority}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.taskMeta}>
                  {task.type && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>🏷️</Text>
                      <Text style={styles.metaText}>{task.type}</Text>
                    </View>
                  )}
                  {task.due_date && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>📅</Text>
                      <Text style={[
                        styles.metaText,
                        isOverdue(task.due_date) && styles.overdueText
                      ]}>
                        {formatDate(task.due_date)}
                        {isOverdue(task.due_date) && ' (Overdue)'}
                      </Text>
                    </View>
                  )}
                  {task.status && (
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                        {task.status}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        ))}

        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptyHint}>Connect your Notion workspace to see your tasks</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  taskCard: {
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  overdueText: {
    color: colors.error,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default TasksScreen;